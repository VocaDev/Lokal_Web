/**
 * Shared auth helpers for /api routes.
 *
 * Pattern mirrored from app/api/export-report/route.ts (the only route the
 * audit found doing this correctly): require an authenticated user, then
 * verify they own the businessId in the request.
 *
 * Use `auth.getUser()` (not `getSession()`) — it round-trips to Supabase to
 * validate the access token, which is what middleware does. Both are fine
 * for our purposes since the route runs server-side, but `getUser` is the
 * documented "trustworthy" option.
 */
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export const UNAUTHORIZED = NextResponse.json(
  { error: "Unauthorized" },
  { status: 401 }
);
export const FORBIDDEN = NextResponse.json(
  { error: "Forbidden" },
  { status: 403 }
);
export const NOT_FOUND = NextResponse.json(
  { error: "Business not found" },
  { status: 404 }
);

export async function requireUser(
  supabase: SupabaseClient
): Promise<User | NextResponse> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return UNAUTHORIZED;
  return data.user;
}

/**
 * Confirm the authenticated user owns `businessId`. Returns the user on
 * success or a NextResponse error to return directly. Single source of
 * truth — every mutating /api route should call this.
 */
export async function requireBusinessOwner(
  supabase: SupabaseClient,
  businessId: string
): Promise<User | NextResponse> {
  const userOrResponse = await requireUser(supabase);
  if (userOrResponse instanceof NextResponse) return userOrResponse;
  const user = userOrResponse;

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) return NOT_FOUND;  // collapse DB errors to 404 — don't leak details
  if (!data) return FORBIDDEN;
  return user;
}

/**
 * Daily AI rate limiter — bumps `ai_usage(user_id, date, count)` and rejects
 * with 429 once the daily threshold is exceeded. Backed by migration 010.
 *
 * Cap is read from `AI_DAILY_LIMIT` env var (default 10). Set to the literal
 * string `unlimited` to bypass the check entirely — testing/dev only.
 */
export async function bumpAiUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const limitRaw = process.env.AI_DAILY_LIMIT?.toLowerCase().trim();
  if (limitRaw === "unlimited") {
    return null; // bypass entirely — no DB write, no 429
  }
  const limit = Number.parseInt(limitRaw ?? "10", 10);
  const effectiveLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;

  // UPSERT with increment: insert with count=1, on conflict bump the existing.
  // Postgres UPDATE clause references the existing row via EXCLUDED + table
  // alias, but Supabase JS doesn't expose that syntax — we read-then-write.
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: readErr } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  if (readErr) {
    // Table missing (migration 010 not applied) → fail-open with a warning so
    // the demo still works locally, but log loudly.
    console.error("[ai-usage] read failed, blocking request:", readErr.message);
    return NextResponse.json(
      { error: "AI rate limit is not available. Generation is blocked to protect usage." },
      { status: 503 }
    );
  }
  const next = (existing?.count ?? 0) + 1;
  if (next > effectiveLimit) {
    return NextResponse.json(
      { error: `Daily AI limit (${effectiveLimit}) reached. Try again tomorrow.` },
      { status: 429 }
    );
  }
  const { error: writeErr } = await supabase
    .from("ai_usage")
    .upsert(
      { user_id: userId, date: today, count: next, updated_at: new Date().toISOString() },
      { onConflict: "user_id,date" }
    );
  if (writeErr) {
    console.error("[ai-usage] write failed, blocking request:", writeErr.message);
    return NextResponse.json(
      { error: "AI rate limit could not be recorded. Generation is blocked to protect usage." },
      { status: 503 }
    );
  }
  return null;
}

const ONE_WEBSITE_GENERATION_ERROR = "This account has already used its AI website generation.";

function rateLimitUnavailable(message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 503 }
  );
}

/**
 * One-time account-wide website generation lock. The first brand-brief call
 * claims the account with a unique user_id row. Parallel clicks race at the DB
 * constraint, so only one request can win.
 */
export async function claimWebsiteGeneration(
  supabase: SupabaseClient,
  userId: string,
  businessId: string,
  generationId: string
): Promise<NextResponse | null> {
  if (!generationId) {
    return NextResponse.json(
      { error: "generationId is required for AI generation" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("website_generation_locks")
    .insert({
      user_id: userId,
      business_id: businessId,
      generation_id: generationId,
    });

  if (!error) return null;

  if (error.code === "23505") {
    return NextResponse.json(
      { error: ONE_WEBSITE_GENERATION_ERROR },
      { status: 429 }
    );
  }

  console.error("[website-generation-lock] claim failed, blocking request:", error.message);
  return rateLimitUnavailable("AI generation lock could not be recorded. Generation is blocked to protect usage.");
}

/**
 * Allows the expensive theme call only when it belongs to the exact generation
 * session that already claimed the account. This blocks direct API calls that
 * skip /api/brand-brief and blocks repeated theme calls for the same account.
 */
export async function validateWebsiteGenerationThemeCall(
  supabase: SupabaseClient,
  userId: string,
  businessId: string,
  generationId: string
): Promise<NextResponse | null> {
  if (!generationId) {
    return NextResponse.json(
      { error: "generationId is required for AI generation" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("website_generation_locks")
    .select("business_id,generation_id,theme_generated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[website-generation-lock] read failed, blocking request:", error.message);
    return rateLimitUnavailable("AI generation lock is not available. Generation is blocked to protect usage.");
  }

  if (!data) {
    return NextResponse.json(
      { error: "Start AI generation from the website builder first." },
      { status: 403 }
    );
  }

  if (data.business_id !== businessId || data.generation_id !== generationId) {
    return NextResponse.json(
      { error: ONE_WEBSITE_GENERATION_ERROR },
      { status: 429 }
    );
  }

  if (data.theme_generated_at) {
    return NextResponse.json(
      { error: ONE_WEBSITE_GENERATION_ERROR },
      { status: 429 }
    );
  }

  const { data: updated, error: updateErr } = await supabase
    .from("website_generation_locks")
    .update({ theme_generated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("theme_generated_at", null)
    .select("user_id")
    .maybeSingle();

  if (updateErr) {
    console.error("[website-generation-lock] update failed, blocking request:", updateErr.message);
    return rateLimitUnavailable("AI generation lock could not be updated. Generation is blocked to protect usage.");
  }

  if (!updated) {
    return NextResponse.json(
      { error: ONE_WEBSITE_GENERATION_ERROR },
      { status: 429 }
    );
  }

  return null;
}
