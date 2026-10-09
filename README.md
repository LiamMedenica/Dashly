# DataBubble

Paste a Google Sheets URL → AI builds you a beautiful interactive dashboard in seconds → save and share with your team. From $9.99/month.

**Domain:** databubble.app  
**Supabase project:** dwohgqlseyvosanitywa

---

## Tomorrow — pick up here

### 1. Save dashboard (highest priority)
The DB schema is already live. Need to wire the canvas "Save" button to write to the `dashboards` table.
- Insert `{ user_id, name, sheet_url, layout }` into `dashboards`
- Enforce plan limits (Free: 1, Starter: 10, Pro: 20) — check count before insert
- After save, show success toast + update `/dashboards` list with real data (replace fake hardcoded rows)
- Gate: prompt sign-in if user is not logged in when they try to save

### 2. Wire AI generation usage tracking
- `ai_generations_used` column is on `profiles` already
- Increment it in `generate-layout.ts` after each successful Haiku call
- Gate: block generation and show upgrade prompt if user has hit their plan limit

### 3. Share link
- `share_slug` (nanoid) and `share_password_hash` columns already exist on `dashboards`
- UI: "Share" button on canvas → generates slug → copies link to clipboard
- Route: `/dashboard/[id]` — public read-only, no auth required to view
- Optional password gate on the share link
- Starter+ only — show upgrade prompt for Free users

### 4. Stripe billing
- `stripe_customer_id` and `plan_expires_at` already on `profiles`
- Wire up Stripe Checkout for Starter ($9.99/mo) and Pro ($17.99/mo)
- Stripe webhook → update `profiles.plan` on subscription events

---

## What's built

- [x] Full dashboard canvas — drag/drop, resize, collision system, Ctrl+Z/C/V
- [x] All tile types — stat cards, bar, line, area, pie, table, text box
- [x] Cross-chart filters + filter panel
- [x] AI dashboard generation (Claude Haiku)
- [x] 6 color palettes + custom color picker
- [x] Landing page — hero, features, pricing (Free/Starter/Pro), FAQ, footer
- [x] Auth — email/password + Google OAuth (Supabase)
- [x] Supabase DB schema — profiles + dashboards tables, RLS, auto-profile trigger
- [x] `/account` page — avatar color picker, name edit, AI usage bar, delete account
- [x] `/dashboards` page — table view, search, 3-dot menu, inline create dialog
- [x] `/terms` and `/privacy` — placeholder legal pages
- [x] UserMenu — hover dropdown, avatar color synced from account settings

## Dev

```bash
# from Dashly/Dashly/
npm run dev
```

App runs at `http://localhost:3000`.

## Env vars (`apps/web/.env.local`)

```
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://dwohgqlseyvosanitywa.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| Monorepo | Turborepo |
| UI components | Base UI + shadcn Nova preset |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |
| AI | Claude Haiku (Anthropic) |
| Auth + DB | Supabase |
| Billing | Stripe (not yet wired) |

## Project structure

```
apps/web/
  app/
    page.tsx          Landing page + auth modal + create dialog
    dashboard/        Canvas page
    dashboards/       Saved dashboards list
    account/          Account settings + delete
    terms/            Terms of service (placeholder)
    privacy/          Privacy policy (placeholder)
  components/
  lib/                Sheets fetch, column analysis, palettes, AI generation
  utils/supabase/     client.ts, server.ts, admin.ts
packages/ui/          Shared component library (@workspace/ui)
```
