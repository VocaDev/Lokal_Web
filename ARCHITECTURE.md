# LokalWeb Architecture

## Tenant Resolution

Tenants are identified by subdomain. On load, the app reads
window.location.hostname, extracts the subdomain, and fetches
the matching business from Supabase.

## Auth Flow

- Supabase Auth for all authentication
- After login, user is linked to a business via profiles table
- RLS policies ensure users only see their own business data

## Key Tables (Supabase)

- businesses — one row per tenant
- profiles — linked to auth.users, has business_id
- bookings — appointments per business
- services — services offered per business

```

---

## Step 4: Use `@workspace` Correctly in Chat

Once the files above exist, start every Copilot Chat session with:
```

@workspace give me a summary of the LokalWeb project structure

```

Then ask things like:
```

@workspace how is tenant isolation currently handled?
@workspace where should I add a new page for managing bookings?
@workspace what TypeScript types exist for the bookings feature?

```

This forces Copilot to ground its answers in *your actual code*, not generic assumptions.

---

## Step 5: Before Every Coding Session

Get into this habit — open Copilot Chat and say:
```

@workspace I'm about to work on [feature name].
What files are relevant and what should I be careful about?
