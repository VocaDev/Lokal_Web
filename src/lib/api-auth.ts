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
    console.warn("[ai-usage] read failed, allowing request:", readErr.message);
    return null;
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
    console.warn("[ai-usage] write failed, allowing request:", writeErr.message);
  }
  return null;
}
