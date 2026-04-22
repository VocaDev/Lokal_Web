# ARCHITECTURE MAP — LokalWeb (Read-Only Investigation)

Date: 2026-04-22
Scope: Next.js 14 + Supabase codebase mapping across public rendering, customization flow, services, booking, hours, gallery, and Groq generation.

---

## SECTION 1 — Public Business Website Rendering

### 1.1 Entry Point Source: app/[subdomain]/page.tsx (full source)

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Business, BusinessHours, Service } from "@/lib/types";
import TemplateRouter from "@/components/templates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("name, description")
    .eq("subdomain", subdomain)
    .maybeSingle();
  if (!data) return { title: "Business Not Found" };
  return {
    title: `${data.name} — Book Online`,
    description: data.description ?? "",
  };
}

export default async function PublicBusinessPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();

  const { data: bizData } = await supabase
    .from("businesses")
    .select("*")
    .eq("subdomain", subdomain)
    .maybeSingle();

  if (!bizData) notFound();

  // ✅ FIXED: was returning NextResponse (a class instance) from a page component,
  // which caused "Only plain objects can be passed to Client Components" error.
  // NextResponse can only be used in Route Handlers or middleware — never in pages.
  if (
    bizData.website_creation_method === "ai_generated" &&
    bizData.custom_website_html
  ) {
    return (
      <div dangerouslySetInnerHTML={{ __html: bizData.custom_website_html }} />
    );
  }

  console.log("DEBUG business:", {
    subdomain: bizData.subdomain,
    website_creation_method: bizData.website_creation_method,
    has_custom_html: !!bizData.custom_website_html,
    html_preview: bizData.custom_website_html?.substring(0, 100),
  });

  const [
    { data: servicesData },
    { data: hoursData },
    { data: customData },
    { data: galleryData },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("business_id", bizData.id)
      .order("price", { ascending: true }),
    supabase
      .from("business_hours")
      .select("*")
      .eq("business_id", bizData.id)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("website_customization")
      .select("*")
      .eq("business_id", bizData.id)
      .maybeSingle(),
    supabase
      .from("gallery_items")
      .select("*")
      .eq("business_id", bizData.id)
      .order("display_order", { ascending: true }),
  ]);

  const customGallery = (galleryData || [])
    .filter((v) => v.image_url)
    .map((v) => v.image_url as string);
  const allGalleryImages = [
    ...(bizData.gallery_images || []),
    ...customGallery,
  ];

  const business: Business = {
    id: bizData.id,
    name: bizData.name,
    subdomain: bizData.subdomain,
    industry: bizData.industry,
    template: bizData.template_id || "bold",
    templateId: bizData.template_id ?? undefined,
    phone: bizData.phone,
    address: bizData.address,
    description: bizData.description,
    logoUrl: bizData.logo_url,
    accentColor: customData?.primary_color || bizData.accent_color,
    socialLinks: bizData.social_links ?? {
      instagram: "",
      facebook: "",
      whatsapp: "",
    },
    galleryImages: allGalleryImages,
    ownerId: bizData.owner_id,
    createdAt: bizData.created_at,
    websiteCreationMethod: bizData.website_creation_method,
    customWebsiteHtml: bizData.custom_website_html,
    showTestimonials: customData?.show_testimonials ?? true,
    showTeam: customData?.show_team ?? true,
    showContact: customData?.show_contact ?? true,
    heroHeight: customData?.hero_height || "medium",
    cardStyle: customData?.card_style || "minimal",
  };

  const themeStyles = customData
    ? ({
        "--primary-color": customData.primary_color,
        "--accent-color": customData.accent_color,
        "--text-color": customData.text_color,
        "--muted-text-color": customData.muted_text_color,
        "--bg-color": customData.bg_color,
        "--surface-color": customData.surface_color,
        "--border-color": customData.border_color,
        "--heading-font":
          customData.heading_font === "dm-sans"
            ? "DM Sans"
            : customData.heading_font === "playfair"
              ? "Playfair Display"
              : customData.heading_font.charAt(0).toUpperCase() +
                customData.heading_font.slice(1),
        "--body-font":
          customData.body_font === "dm-sans"
            ? "DM Sans"
            : customData.body_font === "playfair"
              ? "Playfair Display"
              : customData.body_font.charAt(0).toUpperCase() +
                customData.body_font.slice(1),
      } as React.CSSProperties)
    : {};

  const services: Service[] = (servicesData ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    price: row.price,
    durationMinutes: row.duration_minutes,
  }));

  const hours: BusinessHours[] = (hoursData ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    dayOfWeek: row.day_of_week,
    isOpen: row.is_open,
    openTime: row.open_time,
    closeTime: row.close_time,
  }));

  return (
    <div style={themeStyles} className="theme-customized min-h-screen">
      <TemplateRouter
        business={JSON.parse(JSON.stringify(business))}
        services={JSON.parse(JSON.stringify(services))}
        hours={JSON.parse(JSON.stringify(hours))}
      />
    </div>
  );
}
```

### 1.2 Nested Routes Under [subdomain]/

Only one nested route file was found under `app/[subdomain]/`: `layout.tsx`.

```tsx
export default function SubdomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

### 1.3 URL Resolution Trace (genti.lokal-web-one.vercel.app)

1. `middleware.ts:11-14` defines main-domain check only for:
   - `lokal-web-one.vercel.app`
   - `localhost:3000`
   - `192.168.*`
2. `genti.lokal-web-one.vercel.app` is **not** main domain, so execution goes to subdomain branch.
3. `middleware.ts:33` extracts subdomain by `hostname.split('.')[0]` => `genti`.
4. `middleware.ts:37-39` rewrites URL path to `/${subdomain}${pathname}`.
   - Visiting `/` becomes `/genti/`.
5. Next App Router resolves dynamic segment `app/[subdomain]/page.tsx`, where:
   - `params.subdomain = 'genti'` (`app/[subdomain]/page.tsx:21-23`)
   - Business row lookup by `.eq('subdomain', subdomain)` (`:25-29`)
6. Rendering branch:
   - If `website_creation_method = 'ai_generated'` and `custom_website_html` exists => direct HTML render (`:37-42`).
   - Else fetch services/hours/customization/gallery (`:52-66`) and route through template renderer (`:136-140`).

### 1.4 What Gets Rendered (Template vs AI HTML)

- AI HTML branch exists and is first: `app/[subdomain]/page.tsx:37-42`.
- Template branch is fallback: `app/[subdomain]/page.tsx:134-140` + `src/components/templates/index.tsx:56-82`.
- In `TemplateRouter`:
  - Another AI guard exists at `src/components/templates/index.tsx:44-50`.
  - Template resolution by `industry + templateId` at `:56-82`.

Direct template files confirmed in router imports (`src/components/templates/index.tsx:11-21`):

- `BarberShopFirstTemplate`
- `BarbershopModern`
- `RestaurantBistro`
- plus others (`BarbershopMinimal`, `RestaurantElegant`, `ClinicPremium`, etc.)

### 1.5 Where AI-generated HTML Is Stored (Column + Type)

- Column name used throughout code: `custom_website_html`.
  - Saved at `src/components/website-builder/WebsiteBuilderWizard.tsx:149`.
  - Read at `app/[subdomain]/page.tsx:38-41` and mapped at `:90`.
- Associated mode flag column: `website_creation_method`.
  - Saved as `'ai_generated'` at `WebsiteBuilderWizard.tsx:150`.
  - Checked at `app/[subdomain]/page.tsx:37`.

Schema source status:

- `docs/rls-policies.sql` contains only RLS policies, not DDL types.
- No migration SQL files exist in the repo.
- Therefore DB type cannot be proven from migration in-repo; from usage this field is treated as a string/blob of HTML, i.e. text-like.

### 1.6 Template Selection Logic

Code path:

- Build `business.templateId` from `bizData.template_id` in `app/[subdomain]/page.tsx:78-79`.
- Pass to `TemplateRouter` (`:136-140`).
- `TemplateRouter` picks by `industry` and `tid` switch (`src/components/templates/index.tsx:56-82`).

Conflict behavior when both template and AI HTML exist:

- AI wins.
- Earliest return in `app/[subdomain]/page.tsx:37-42` short-circuits before template rendering and before service/hour/gallery fetch.

---

## SECTION 2 — Customization Hub → Public Website Data Flow

CustomizationHub editable settings discovered in:

- `src/components/dashboard/CustomizationHub/ColorSection.tsx`
- `src/components/dashboard/CustomizationHub/TypographySection.tsx`
- `src/components/dashboard/CustomizationHub/LayoutSection.tsx`
- `src/components/dashboard/CustomizationHub/GallerySectionItem.tsx`

Write endpoints:

- Theme/layout/font/toggles: `app/api/customization/[businessId]/route.ts` PATCH (`:58-123`)
- Gallery uploads: `app/api/gallery/[businessId]/upload/route.ts` (`:45-58`)

Read on public page:

- `app/[subdomain]/page.tsx` customization merge (`:84`, `:91-95`, `:98-113`)
- gallery merge (`:68-71`)
- template-specific consumption primarily in `src/components/templates/custom/BarberShopFirstTemplate.tsx`

### Critical Matrix

| Setting                | DB Column                                           | Written At                                                                                                                 | Read At (public)                                                                                     | Status                                                  |
| ---------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Primary color          | `website_customization.primary_color`               | `src/components/dashboard/CustomizationHub/ColorSection.tsx:20` -> `app/api/customization/[businessId]/route.ts:69,86,119` | `app/[subdomain]/page.tsx:84,100`; used via `business.accentColor` in booking UI and template styles | WIRED                                                   |
| Accent color           | `website_customization.accent_color`                | `ColorSection.tsx:33` -> `app/api/customization/[businessId]/route.ts:70,87,119`                                           | `app/[subdomain]/page.tsx:101`                                                                       | SAVES-ONLY (read into CSS var, no template usage found) |
| Text color             | `website_customization.text_color`                  | `ColorSection.tsx:46` -> API `:71,88,119`                                                                                  | `app/[subdomain]/page.tsx:102`; consumed in `BarberShopFirstTemplate.tsx:43`                         | WIRED                                                   |
| Muted text color       | `website_customization.muted_text_color`            | `ColorSection.tsx:59` -> API `:72,89,119`                                                                                  | `app/[subdomain]/page.tsx:103`                                                                       | SAVES-ONLY (no public template reference found)         |
| Background color       | `website_customization.bg_color`                    | `ColorSection.tsx:72` -> API `:73,90,119`                                                                                  | `app/[subdomain]/page.tsx:104`; consumed `BarberShopFirstTemplate.tsx:42,115,182`                    | WIRED                                                   |
| Surface color          | `website_customization.surface_color`               | `ColorSection.tsx:85` -> API `:74,91,119`                                                                                  | `app/[subdomain]/page.tsx:105`; consumed `BarberShopFirstTemplate.tsx:127`                           | WIRED                                                   |
| Heading font           | `website_customization.heading_font`                | `TypographySection.tsx:29` -> API `:76,93,119`                                                                             | `app/[subdomain]/page.tsx:107-109`; consumed `BarberShopFirstTemplate.tsx:83,119,186,213`            | WIRED                                                   |
| Body font              | `website_customization.body_font`                   | `TypographySection.tsx:49` -> API `:77,94,119`                                                                             | `app/[subdomain]/page.tsx:110-112`; consumed `BarberShopFirstTemplate.tsx:44`                        | WIRED                                                   |
| Hero height            | `website_customization.hero_height`                 | `LayoutSection.tsx:24` -> API `:78,95,119`                                                                                 | `app/[subdomain]/page.tsx:94`; consumed `BarberShopFirstTemplate.tsx:65`                             | WIRED                                                   |
| Card style             | `website_customization.card_style`                  | `LayoutSection.tsx:45` -> API `:79,96,119`                                                                                 | `app/[subdomain]/page.tsx:95`                                                                        | SAVES-ONLY (no public template usage found)             |
| Show testimonials      | `website_customization.show_testimonials`           | `LayoutSection.tsx:65,74` -> API `:80,97,119`                                                                              | `app/[subdomain]/page.tsx:91`                                                                        | SAVES-ONLY (no public template usage found)             |
| Show team              | `website_customization.show_team`                   | `LayoutSection.tsx:66,74` -> API `:81,98,119`                                                                              | `app/[subdomain]/page.tsx:92`                                                                        | SAVES-ONLY (no public template usage found)             |
| Show contact           | `website_customization.show_contact`                | `LayoutSection.tsx:67,74` -> API `:82,99,119`                                                                              | `app/[subdomain]/page.tsx:93`; consumed `BarberShopFirstTemplate.tsx:181`                            | WIRED                                                   |
| Gallery hero image     | `gallery_items.section_key='hero'`, `image_url`     | `GallerySectionItem.tsx:39` -> `app/api/gallery/[businessId]/upload/route.ts:49-53`                                        | `app/[subdomain]/page.tsx:68-71` (flattened list)                                                    | WIRED (section key not respected publicly)              |
| Gallery about image    | `gallery_items.section_key='about'`, `image_url`    | same write path as above                                                                                                   | same read path as above                                                                              | WIRED (section key not respected publicly)              |
| Gallery services image | `gallery_items.section_key='services'`, `image_url` | same write path as above                                                                                                   | same read path as above                                                                              | WIRED (section key not respected publicly)              |
| Gallery team image     | `gallery_items.section_key='team'`, `image_url`     | same write path as above                                                                                                   | same read path as above                                                                              | WIRED (section key not respected publicly)              |
| Gallery contact image  | `gallery_items.section_key='contact'`, `image_url`  | same write path as above                                                                                                   | same read path as above                                                                              | WIRED (section key not respected publicly)              |

Important pattern: most advanced customization values are only visibly applied in one custom template (`BarberShopFirstTemplate`). Other templates mostly use hardcoded styles/classes.

---

## SECTION 3 — Services on Public Website

### 3.1 Where Services Are Stored (schema + sample row)

No SQL DDL migrations for `services` are present in the repository.

Schema evidence from code:

- Write payload shape in `src/lib/store.ts:205-216` (`services` upsert):
  - `id`
  - `business_id`
  - `name`
  - `description`
  - `price`
  - `duration_minutes`
- Public mapping in `app/[subdomain]/page.tsx:116-123` confirms same fields.

Sample row (constructed directly from write/mapping code paths):

```json
{
  "id": "2f91f4ec-4f93-4c73-a5aa-2f0db5876b9b",
  "business_id": "8e8b9b7d-28d0-4b4e-b7f2-4c5ce6d5aa09",
  "name": "Haircut",
  "description": "Standard men haircut",
  "price": 10,
  "duration_minutes": 30
}
```

### 3.2 Where Public Website Reads Services

- Fetch from DB: `app/[subdomain]/page.tsx:55-58`
- Camel-case mapping: `app/[subdomain]/page.tsx:116-123`
- Passed to template renderer: `app/[subdomain]/page.tsx:138`
- Rendered in templates, e.g.:
  - `src/components/templates/custom/RestaurantBistro.tsx:113-140`
  - `src/components/templates/custom/BarberShopFirstTemplate.tsx:124-157`

### 3.3 Where Services Are Embedded in AI-generated HTML

- AI output is stored as business-level HTML blob in `businesses.custom_website_html`:
  - save: `WebsiteBuilderWizard.tsx:149`
  - render: `app/[subdomain]/page.tsx:37-42`
- Prompt asks model to invent service names/prices, not inject DB services:
  - `app/api/generate-website/route.ts:38` (“realistic service names and prices in EUR…”)

Empirical generated HTML check (local POST to `/api/generate-website`):

- Returned static service cards: “Breakfast”, “Lunch”, “Dinner” with generated EUR values.
- No DB-backed injection path was present.

### 3.4 Conclusion (Services)

Services created in dashboard are visible only on template-rendered sites. AI-generated sites bypass service table reads entirely because `app/[subdomain]/page.tsx` returns `custom_website_html` early (`:37-42`) before any `services` query (`:55-58`). The Groq prompt itself asks for fabricated “realistic” services, so AI pages show invented content rather than owner-managed services.

---

## SECTION 4 — Booking System on Public Website

### 4.1 Booking Flow Source (Book button, slots, submit)

Book Now button examples:

- `src/components/templates/custom/BarberShopFirstTemplate.tsx:57,101`
- `src/components/templates/custom/RestaurantBistro.tsx:40,78`
- many templates mount `BookingDrawer`/`RestaurantBookingDrawer`

Time-slot generation:

- `src/components/templates/shared/BookingDrawer.tsx:96-122`
- `src/components/templates/shared/RestaurantBookingDrawer.tsx:137-159`

Submission logic:

- `BookingDrawer` uses `addBooking(...)` at `BookingDrawer.tsx:147-153`
- `RestaurantBookingDrawer` inserts directly into `bookings` at `RestaurantBookingDrawer.tsx:95-104`

### 4.2 Where Booking Inserts Into `bookings`

Path A (generic templates):

- `BookingDrawer.tsx:147-153` -> `src/lib/store.ts:169-183`
- Actual insert call: `src/lib/store.ts:171-180` (`.from("bookings").insert({...})`)

Path B (RestaurantBistro drawer):

- Direct insert: `src/components/templates/shared/RestaurantBookingDrawer.tsx:95-104`

### 4.3 AI-generated HTML Booking Integration Check

Code-level evidence:

- AI pages short-circuit render to raw HTML at `app/[subdomain]/page.tsx:37-42`.
- Prompt requests only “functional-looking” booking form (`app/api/generate-website/route.ts:40,61`), no endpoint injection.

Empirical output evidence:

- Generated HTML contains `<form ...>` with inputs/select/button.
- `HAS_FORM=true`, `HAS_ACTION_ATTR=false`.
- No `fetch(...)`, no `/api/` booking endpoint, no Supabase call.

### 4.4 Conclusion (Booking on AI Sites)

Booking does not work on AI-generated sites because those pages are plain injected HTML with no wired integration into `bookings`. The prompt explicitly asks for a visually realistic booking section, and the produced markup is standalone form UI only. Since `app/[subdomain]/page.tsx` exits early for AI mode, React booking components (`BookingDrawer` / `RestaurantBookingDrawer`) never mount.

---

## SECTION 5 — Business Hours on Deployed App

### 5.1 Full Source: app/dashboard/hours/page.tsx

```tsx
"use client";
import { useEffect, useState } from "react";
import { Business, BusinessHours } from "@/lib/types";
import {
  getBusinessHours,
  saveBusinessHours,
  getCurrentBusiness,
} from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function BusinessHoursPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [hours, setHours] = useState<BusinessHours[]>([]);

  useEffect(() => {
    getCurrentBusiness()
      .then((biz) => {
        setBusiness(biz);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!business?.id) return;
    (async () => {
      try {
        const data = await getBusinessHours(business.id);
        setHours(data);
      } catch (err) {
        console.error("Failed to load business hours", err);
      }
    })();
  }, [business?.id]);

  const update = (
    dayOfWeek: number,
    field: keyof BusinessHours,
    value: string | boolean,
  ) => {
    setHours((prev) =>
      prev.map((h) =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h,
      ),
    );
  };

  const handleSave = async () => {
    if (!business?.id) return;
    try {
      await saveBusinessHours(hours);
      toast({ title: "Business hours saved" });
    } catch (err) {
      console.error("Failed to save business hours", err);
      toast({ title: "Failed to save business hours", variant: "destructive" });
    }
  };

  if (loading || !business) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        Loading business hours...
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Business Hours
      </h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hours.map((h) => (
              <div
                key={h.dayOfWeek}
                className="flex items-center gap-4 py-2 border-b last:border-0"
              >
                <span className="w-24 text-sm font-medium text-foreground">
                  {dayNames[h.dayOfWeek]}
                </span>
                <Switch
                  checked={h.isOpen}
                  onCheckedChange={(v) => update(h.dayOfWeek, "isOpen", v)}
                />
                {h.isOpen ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={h.openTime}
                      onChange={(e) =>
                        update(h.dayOfWeek, "openTime", e.target.value)
                      }
                      className="w-32"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="time"
                      value={h.closeTime}
                      onChange={(e) =>
                        update(h.dayOfWeek, "closeTime", e.target.value)
                      }
                      className="w-32"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </div>
          <Button className="mt-6" onClick={handleSave}>
            Save Hours
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5.2 Exact Supabase Insert/Update Logic for business_hours

- Save call from UI: `app/dashboard/hours/page.tsx:46`
- Implementation: `src/lib/store.ts:252-264`

```ts
const { error } = await supabase.from("business_hours").upsert(
  hours.map((h) => ({
    id: h.id,
    business_id: h.businessId,
    day_of_week: h.dayOfWeek,
    is_open: h.isOpen,
    open_time: h.openTime,
    close_time: h.closeTime,
  })),
);
```

### 5.3 RLS Policies on business_hours

From `docs/rls-policies.sql`:

- Enable RLS: line 8
- Public read policy: lines 61-63
- Owner manage policy (ALL): lines 65-74

Policy summary:

- `SELECT` allowed for everyone.
- `ALL` (insert/update/delete) allowed only when auth user owns the linked business.

### 5.4 Are business_hours rows auto-created on registration?

- `app/register/page.tsx:133-141` inserts only `businesses` row.
- No `business_hours` insert exists in this registration flow.

However:

- `src/lib/store.ts:131-141` seeds default `business_hours` rows inside `registerBusiness(...)`.
- `registerBusiness(...)` is called by `app/dashboard/new-business/page.tsx:132`.

Conclusion:

- Initial auth registration flow (`/register`) does **not** auto-create hours.
- New-business flow inside dashboard does auto-seed hours.

### 5.5 Local Test of Hours Save Flow (runtime errors observed)

Attempt performed:

- Ran `npm run dev`.
- Opened `/dashboard/hours` locally.

Observed runtime output:

- `GET /dashboard/hours 404`.
- Root cause in middleware domain check: `middleware.ts:11-14` treats only `localhost:3000` as main domain. Dev server started on `3001`, so request gets rewritten as subdomain route and misses dashboard path.

Observed full relevant runtime error log excerpt:

- `GET /dashboard/hours 404 in 4693ms`
- `POST /api/generate-website 404 in 1391ms` (same host rewrite issue before host-header workaround)
- Also encountered Next static-path generation runtime exception during dev:
  - `TypeError: __webpack_modules__[moduleId] is not a function` while resolving `/[subdomain]`.

Browser-console limitation:

- Browser-console capture was not accessible in this agent session, so no direct browser-console Supabase error string could be extracted.
- Given the 404 middleware rewrite, the hours page save code path did not reach Supabase in this local run.

---

## SECTION 6 — Gallery Images

### 6.1 Gallery Upload UI Source

UI files:

- `src/components/dashboard/CustomizationHub/GallerySection.tsx`
- `src/components/dashboard/CustomizationHub/GallerySectionItem.tsx`

Upload trigger path:

- `GallerySectionItem.tsx:39` -> `uploadGalleryImage(...)` -> `/api/gallery/${businessId}/upload`

### 6.2 Supabase Storage Upload + Bucket

`app/api/gallery/[businessId]/upload/route.ts`:

- Upload to storage bucket: `:26-28`
  - `.storage.from('business-gallery').upload(...)`
- Public URL generation: `:41`
- DB write to `gallery_items`: `:45-58` (upsert), fallback insert `:64-73`

Bucket name: `business-gallery`

### 6.3 Bucket RLS / Storage Policies

- No storage SQL policies were found in repository SQL files.
- `docs/rls-policies.sql` only includes table policies (`businesses`, `services`, `business_hours`, `bookings`), not `storage.objects`.
- Therefore storage policy state is not documented in repo; likely configured in Supabase project dashboard.

### 6.4 Where Public Website Reads Gallery Images

- Reads from `gallery_items`: `app/[subdomain]/page.tsx:65`
- Merges with `businesses.gallery_images`: `app/[subdomain]/page.tsx:71`
- Passes merged array to templates as `business.galleryImages` (`:86,137`)
- Templates consume indexes (`[0]`, `[1]`) as hero/story images (example `RestaurantBistro.tsx:47,155`)

### 6.5 Status: Do uploaded gallery images appear on public site?

- Template-rendered sites: **Yes, usually**. Uploaded URLs from `gallery_items` are merged into `business.galleryImages` and used by templates.
- Caveat: `section_key` is ignored by public renderer; images become a flattened list (`app/[subdomain]/page.tsx:68-71`), so section placement is not deterministic by key.
- AI-generated sites: **No integration**. Raw `custom_website_html` bypasses React template gallery logic (`app/[subdomain]/page.tsx:37-42`).

---

## SECTION 7 — Current Groq Prompt Analysis

### 7.1 Prompt Source (from app/api/generate-website/route.ts)

Prompt block location: `app/api/generate-website/route.ts:16-63`

````text
You are a world-class web designer and developer. Generate a stunning, complete, single-file HTML website for a business. Make it look like it was designed by a top-tier creative agency — not a template.

Business Name: ${businessName}
Industry: ${industry}
Tagline: ${tagline}
Primary Color: ${primaryColor}
Layout Style: ${layoutStyle}
Sections to include: ${sections.join(", ")}

DESIGN REQUIREMENTS:
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Dark background theme: #0a0a0f for page background, #151522 for cards, #1e1e35 for inputs
- Primary color: ${primaryColor} for buttons, accents, and highlights
- Gradient accent: linear-gradient(135deg, ${primaryColor}, #8b5cf6) for hero and CTAs
- Borders: rgba(120,120,255,0.12) default, rgba(120,120,255,0.22) on hover
- Font: Import DM Sans from Google Fonts for all text
- Fully responsive, mobile-first design
- Smooth scroll behavior on all nav links
- The design must feel premium, modern, and unmistakably specific to the ${industry} industry in Kosovo

SECTIONS (only include the ones listed above):
- hero: Full viewport height hero with large bold business name, tagline, two CTA buttons (Book Now + Learn More), gradient background with subtle animated blob effects
- services: Grid of 3-6 service cards with relevant emoji icons, realistic service names and prices in EUR for ${industry}
- hours: Clean business hours table (Mon-Fri 9:00-18:00, Sat 10:00-15:00, Sun closed)
- booking: Styled booking section with form (name, phone, service select, date picker, gradient submit button)
- contact: Contact section with phone, address, email, and a green WhatsApp button
- gallery: Image gallery grid using gradient-colored placeholder divs with overlay captions
- testimonials: 3 customer testimonial cards with realistic Kosovar names, 5-star ratings (★★★★★), and specific feedback for ${industry}

LAYOUT STYLES:
- modern: Gradient hero, rounded-2xl cards, gradient buttons, subtle glow effects
- minimal: Clean whitespace, thin borders, flat design, lots of breathing room
- bold: Large 80px+ hero text, high contrast, strong CTAs, full-width colored sections
- elegant: Generous spacing, refined typography, subtle fade animations, luxury aesthetic

TECHNICAL REQUIREMENTS:
- Single HTML file, complete and valid (starts with <!DOCTYPE html>, ends with </html>)
- Sticky navbar with business name and smooth scroll nav links, with mobile hamburger menu
- Hero section must be visually impressive — full viewport height, centered content, animated gradient blobs
- All cards must have hover effects (translateY, border glow)
- Footer with business name, quick links, social placeholders, copyright
- Use only Tailwind utility classes + a <style> block for custom CSS variables and keyframe animations
- Vanilla JS only — no frameworks
- Do NOT use Lorem Ipsum — use realistic, specific content for ${industry} and ${businessName}
- Do NOT leave placeholder text like [Your Address] — invent realistic Kosovo-specific details (addresses in Prishtinë, Prizren, Pejë, etc.)
- Make the booking form functional-looking with proper validation feedback styles

Return ONLY the HTML code, no explanation, no commentary, wrapped in ```html ... ``` markers.
````

### 7.2 Business Data Not Injected Into Prompt

The prompt does **not** inject the following real DB-backed business data:

- Services list from `services` table
- Real service prices/durations from `services`
- Owner contact details from business profile
- Real business address from `businesses.address`
- Real business hours from `business_hours`
- Gallery image URLs from `gallery_items`/`businesses.gallery_images`
- Social links from `businesses.social_links`
- Booking endpoint URL or booking API contract

Only injected variables are: `businessName`, `industry`, `tagline`, `primaryColor`, `layoutStyle`, `sections` (`route.ts:14,18-23`).

### 7.3 Confirmation

Confirmed: current prompt asks Groq to generate/invent realistic content because actual business data is not passed in.

---

## Root Cause Summary

1. Public renderer has a hard branch split: AI mode returns raw `custom_website_html` immediately (`app/[subdomain]/page.tsx:37-42`), bypassing all structured data fetches (services/hours/customization/gallery).
2. CustomizationHub saves many fields, but public templates consume only a subset; several settings are persisted but not rendered (`show_testimonials`, `show_team`, `card_style`, etc.).
3. AI generation prompt is detached from real tenant data, so generated pages contain invented services/hours/contact/booking markup.
4. Booking integration exists only in React template components; AI-generated pages have no wired endpoint and no Supabase booking calls.
5. Environment/routing assumptions in middleware (`localhost:3000` only as main domain) break local dashboard paths on alternate ports (e.g. 3001), obscuring hours/save testing and causing 404 detours.
