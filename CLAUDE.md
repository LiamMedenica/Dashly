# DataBubble

"Tableau but in 2026" — paste a Google Sheets URL → auto-generate an interactive dashboard → share with team → from $9.99/month.

**Pricing:** Free ($0, 1 dashboard, no sharing) · Starter ($9.99/mo / £7.99, 10 dashboards, sharing — "Most popular") · Pro ($17.99/mo / £15.99, 20 dashboards, custom branding). Sharing is a paid feature (Starter+). Currency auto-detects via `navigator.language`.

Brand name: **DataBubble** (was Dashly). Domain: databubble.app. CSS classes use `db-` prefix.

## Monorepo structure

```
apps/web/          Next.js 16 App Router (primary app)
packages/ui/       Shared components (@workspace/ui/*)
```

`@/` resolves to `apps/web/` root.

## Key files

| File | Purpose |
|------|---------|
| `apps/web/app/page.tsx` | Landing page — "Create a dashboard" button + URL input modal |
| `apps/web/app/dashboard/page.tsx` | Server component — fetches CSV, analyzes columns, renders canvas |
| `apps/web/components/dashboard-grid.tsx` | Main client component — all tile types, dialogs, drag-drop canvas |
| `apps/web/components/app-sidebar.tsx` | Sidebar — chart type picker (draggable items), data columns list |
| `apps/web/lib/sheets.ts` | `extractSheetId` + `fetchSheetData` (Google Sheets CSV, no API key) |
| `apps/web/lib/analyze.ts` | Column type detection (`date / number / category / text / id`) |
| `apps/web/lib/demo-data.ts` | Deterministic fake e-commerce dataset + `buildDemoLayout(canvasW)` |
| `apps/web/lib/generate-layout.ts` | Haiku-powered layout generation — prompt, validation, trend computation |
| `apps/web/lib/palettes.ts` | 6 color palettes (Violet default) + `buildCustomPalette` |

## Tech stack gotchas

**UI library**: Base UI (`@base-ui/react`), NOT Radix. Shadcn was inited with Nova preset.

**Base UI HoverCard**: wraps `PreviewCard` from `@base-ui/react/preview-card`. Does NOT accept `openDelay`/`closeDelay` (those are Radix props). Base UI handles hover timing internally.

**Dark mode**: CSS variable dark mode. Chart colors use the `theme` object in `ChartConfig` to set different shades per mode — `light: "oklch(0.371 0 0)"` / `dark: "oklch(0.87 0 0)"` — because `--chart-1` is a light grey in both modes and invisible against a light card background.

**Custom tile grid** (replaced react-grid-layout entirely):
- `SNAP = 24px` — all positions/sizes are multiples of 24
- `type LayoutItem = { id, x, y, w, h, type: "stat"|"chart"|"table", stat?, chart?, table? }` in pixels
- `buildLayout()` — returns `[]`; canvas starts empty, tiles are dragged in from sidebar
- Canvas div: `position: relative; overflow-x: hidden`. Items: `position: absolute; left: x; top: y`
- `useIsomorphicLayoutEffect` fires before paint — no layout flash
- `canvasW = el.clientWidth - SNAP` (1 tile narrower than actual to tighten drag bounds)
- Drag: rubber-band overshoot on all edges, hard snap on release via `clamp(snapTo(rx), minX, maxX)`
- Resize: 8 edge/corner handles (opacity-0, visible on group-hover), all bounds-checked against canvasW
- Fixed overlay `z-40` during drag blocks sidebar hover cards and sets grabbing cursor globally
- `cancelActiveDrag` module-level ref prevents stuck drags on multi-mousedown
- **Collision system** — 1-SNAP gap enforced between all items at all times
  - `tilesOverlap(a, b)` — commit-time check, 1-SNAP padding on all sides
  - `tileShouldYield(item, blocker)` — preview check, requires ≥40% penetration on BOTH axes (threshold is `Math.min(item.w, blocker.w) * 0.4`). Uses the smaller tile's dimension so a large chart won't cascade from a barely-touching KPI, but a KPI dragged 40%+ into a chart still triggers cascade.
  - `computeCascade(layout, dragId, dragX, dragY, canvasW, preview?)` — returns resolved `LayoutItem[]` or `null` (bounce)
    - `push(item, tx, ty, chain)` — nested recursive chain-push; moves `item` to (tx,ty), recursively pushing any tiles in the way in the same direction. Saves full `working` snapshot before attempting; rolls back all on failure. Cycle-guarded via `chain: Set<string>`.
    - **3-branch `onUpdate`**: (1) ≥40% penetration → cascade; (2) SNAP-gap violation only → small tile near single larger blocker snaps adjacent via `resolveCollision`, otherwise bounce to origin; (3) clear → place freely
    - **Same-row tiles** (`sameRow = |item.y − blocker.y| < SNAP`): try BOTH horizontal directions before falling down — ensures 3-tile horizontal chain-shuffles work even when the preferred side hits the canvas wall
    - **Cross-row tiles** (`preferUp = item.y >= blocker.y`): if item is below the blocker (blocker moved down from above), try UP first — this gives swap/bubble-up behaviour so KPIs rise into the space a large chart vacated
    - On `null` return → dragged tile bounces back to origin (no teleportation)
  - `resolveCollision` — finds nearest free adjacent slot (right/left/below/above the first padded blocker). `allowFallback=false` returns `null` instead of the invalid position when no candidate is free. Blocker detection uses padded `rectOverlaps` (same as `tilesOverlap`) so zero-gap touching tiles are caught.
  - Live preview during drag: fires per-RAF via `dragRafRef` when snap position changes; sets `dragProjection` Map for ghost rendering. Tiles rearrange on drop (not live), but preview shows likely destination.

**Base UI + drag-drop**: Base UI components intercept drag events. Sidebar draggable items use plain `<div onMouseDown={...}>` dispatching `window.dispatchEvent(new CustomEvent(...))` — never wrapped in SidebarMenuButton or similar. DashboardGrid listens via `window.addEventListener`.

**Sidebar drag events**:
- `"sidebar-drag-stat"` (plain `Event`) → opens stat card config dialog
- `"sidebar-drag-chart"` (`CustomEvent` with `{ detail: { type: "bar"|"line"|"area"|"pie" } }`) → opens chart config dialog
- `"sidebar-drag-table"` (plain `Event`) → opens table config dialog

**Date math**: All period calculations use `dataMaxDate()` (max date in the data), NOT `new Date()`. This means "current month" = month of the most recent data row, standard BI behaviour for static datasets.

**Stale closures**: `layoutRef`, `columnsRef`, `rowsRef` are updated every render so sidebar-drag `useEffect` handlers (registered once) always read current state without re-registering.

**Portals**: Calendar date picker and context menu both render into `document.body` via `createPortal` to avoid layout disruption from parent overflow or z-index.

**Chart primitives**: Use `ChartContainer` + `ChartTooltipContent` from `@workspace/ui/components/chart` (not raw recharts). These are the shadcn/Nova chart wrappers that inject CSS variables and style the tooltip.

**Chart colors**: `SERIES_COLORS` constant in `dashboard-grid.tsx` — zero-chroma oklch for grey defaults. `primary: { light: "oklch(0.371 0 0)", dark: "oklch(0.87 0 0)" }`, `secondary: { light: "oklch(0.58 0 0)", dark: "oklch(0.62 0 0)" }`. Pie charts use `--chart-1` through `--chart-5` CSS variables for multi-slice colors.

**SVG overflow**: Recharts SVG has `overflow: visible` by default — chart paths bleed into card headers on large tiles. Fix: add `[&_.recharts-surface]:overflow-hidden` to `ChartContainer` className. This clips the SVG without affecting the tooltip sibling div.

**ResponsiveContainer in Portals**: Never use `<ResponsiveContainer width="100%">` inside a Base UI Portal (e.g. HoverCardContent). The Portal container has no CSS dimensions on first render so the chart renders at zero size. Use fixed pixel dimensions directly on the chart component instead: `<BarChart width={152} height={56} ...>`.

**Dual-series charts**: `aggregateByXMulti(rows, xCol, y1Col, y2Col, agg)` returns `{ x, y, y2 }[]`. Line/Area both support optional `yCol2`. Clearing `yCol2` auto-resets `stacked` and `showLegend`.

**Area chart gradients**: Each AreaCard uses unique SVG gradient IDs (`gy-${item.id}`, `gy2-${item.id}`) to avoid gradient conflicts between multiple area tiles on the canvas.

**Pie chart center label**: Font size is derived from the actual `innerRadius` pixel value passed by recharts to the Label content callback (`viewBox.innerRadius`), so text scales correctly as the tile is resized. Formula: `fs = clamp(ir * 0.5, 10, 22)`.

**Table primitive**: `TableCard` uses plain `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell` from `@workspace/ui/components/table` — NOT TanStack or dnd-kit. Sticky header via `sticky top-0 bg-muted`, scrollable body via `overflow-auto` on CardContent.

## UX principle

Value-first: users create a dashboard without an account. Auth (Clerk/NextAuth) is only prompted when they try to share or save.

## What's built

- [x] Landing page with URL paste modal
- [x] Server-side Google Sheets CSV fetch + parse
- [x] Column type detection (date / number / category / text / id)
- [x] Custom tile-based drag-and-drop canvas (SNAP=24px, absolute positioning)
- [x] Drag with rubber-band overshoot + spring snap, bounded by canvas edges
- [x] 8-handle edge/corner resize, bounds-checked
- [x] Fixed overlay during drag (blocks sidebar hover, enforces grabbing cursor)
- [x] Collision detection — 1-SNAP gap enforced, items cannot overlap
- [x] Chain-push cascade: `push()` recursively shifts tiles in the same direction, enabling 3-tile horizontal shuffles
- [x] Bounce: drop rejected (cascade returns null) → dragged tile snaps back to origin
- [x] Same-row horizontal priority: tiles in same row always try both horizontal directions before falling down
- [x] Cross-row preferUp: tiles below a descending drag tile escape upward (swap/bubble-up), not further down
- [x] Live preview cascade during drag (`dragProjection`) — shows ghost destinations before drop
- [x] **Ctrl+Z** undo (history stack, up to 50 states), **Ctrl+C / Ctrl+V** copy-paste tiles
- [x] Right-click context menu on all tile types: Duplicate / Edit / Delete
- [x] **Stat cards** — drag from sidebar → config dialog (metric, aggregation, period, trend comparison)
  - Period filter system: `FilterPeriod` presets + custom date range (calendar portal)
  - Data-relative dates: "current month" = month of latest data point, not today
  - Trend comparison: computes current vs previous equivalent calendar period
  - Human-readable filter label displayed on card ("April 2024", "Q1 2024", etc.)
- [x] **Bar charts** — config dialog (X axis, Y axis, aggregation, period)
  - `aggregateByX()` groups rows by X value, applies chosen aggregation, sorts by date or alphabetically
  - Orientation toggle (vertical bars ↔ horizontal bars) stored in layout state
  - Theme-aware bar color: dark grey in light mode, light grey in dark mode
- [x] **Line charts** — smooth/linear toggle, optional second series, data labels toggle
  - Dual `LabelList`: y on `position="top"`, y2 on `position="bottom"` to prevent overlap
- [x] **Area charts** — optional second series, stack toggle (y2 only), legend toggle (y2 only)
  - SVG gradient fills with unique IDs per tile, `domain={[0,'auto']}` on YAxis to floor at zero
- [x] **Pie charts** — donut style, config dialog (slice column, value column, aggregation)
  - Center label shows total + column name, font size scales with innerRadius
  - Toggleable center total and color legend (both default on)
  - Up to 6 slices using `--chart-1` through `--chart-5` CSS variables
- [x] **Tables** — config dialog with column checkboxes (select/deselect all) and period filter
  - Sticky header, scrollable body, 100-row limit with "Showing N of M rows" footer
- [x] Sidebar hover previews for all tile types (fixed pixel dimensions, no ResponsiveContainer in portals)
- [x] **Text box tiles** — `type: "text"` tile with Tiptap v3 rich text editor. Drag from sidebar, double-click to edit.
  - Edit dialog: transparent `DialogContent` overlay, tile rendered at exact canvas dimensions, Tiptap toolbar above, Save/Cancel centred below
  - Toolbar uses `bg-background` (not `bg-muted`) — muted is near-white in light mode
  - Inactive toolbar buttons: `text-foreground/70` (not `text-muted-foreground`) for light-mode visibility
  - `useEditorState` hook required for reactive `isActive()` in toolbar — plain `useEditor` doesn't trigger re-renders
- [x] **Live edit previews** — all chart/table/stat edit dialogs show a two-column layout: form left, live preview right
  - `DialogContent` max-width must be overridden with inline `style={{ maxWidth: '56rem' }}` — base class `sm:max-w-sm` beats Tailwind utilities
  - Footer is a plain `<div>` not `<DialogFooter>` (which has `-mb-4` that clips content in `p-0` parents)
  - Preview chart mounts via `chartPreviewReady` gate (120ms timeout after dialog opens) — prevents Recharts line animation stuttering against the dialog's CSS open transition
  - All chart card components have `isPreview?: boolean` prop; bar chart preview wires `onToggleOrientation` to `chartConfigOrientation` state
  - Line/Area curves use `type="monotone"` — `"natural"` cubic splines can oscillate below zero into axis text
- [x] **Demo dashboard** — `/dashboard?demo=true` renders a fake e-commerce dataset with a pre-built layout. `buildDemoLayout(canvasW)` is called client-side after canvas width is measured so tiles fill the full width at any resolution. `ResizeObserver` re-runs it on window resize.
- [x] **Color palettes** — 6 palettes (Violet, Sky, Indigo, Rose, Teal, Coral) with lighter, more inviting oklch values. Custom HSV color picker in the header. Default is Violet.
- [x] **AI dashboard generation** — "Generate dashboard →" on the landing page dialog calls Claude Haiku server-side with column schema + 20 sample rows. Haiku returns a `LayoutItem[]` JSON array in SNAP units; server scales to pixels, validates bounds/column references, right-aligns rows, computes stat values and trend comparisons, then passes as `initialLayout` to the canvas. Falls back to empty canvas on failure. `ANTHROPIC_API_KEY` in `apps/web/.env.local`.
  - Granularity detection: inspects median gap between unique dates → daily/weekly/monthly/yearly → drives trend label ("vs last week" etc.) and is included in the Haiku prompt so chart titles match.
- [x] **Cross-chart filters / slicers** — `FilterContext` holding `{ filters: SlicerFilters, dateFrom, dateTo, setFilter, setDateRange, clearAll }`. Clicking a bar or pie slice sets a categorical slicer. All card components call `applyGlobalFilter(rows, columns, filters, dateFrom, dateTo)` via context — bypasses `GridItem` React.memo.
  - Pie chart excludes its own xCol from `applyGlobalFilter` so all slices stay visible; selection shown via `fillOpacity` (0.35 for unselected)
  - Bar chart onClick uses `d.payload.x` (not `d.x` which is pixel position); date-type x columns skip click-to-filter
  - All charts remount on filter change via `key={filterKey}` → clean Recharts enter animation, no partial-draw glitch
- [x] **Filter panel** — floating popup (`absolute top-14 right-3`, `w-72`, `rounded-xl`, scale+opacity animation). Filters button top-right, palette-accent border/text, badge shows active count.
  - Date range: preset pills (All/7D/30D/3M/YTD/1Y) + custom dual-handle `DateRangeSlider` (document mousemove/mouseup, handles in closure)
  - Categorical slicers: one `<select>` per category/text column with 2–100 unique values
  - Footer: **Clear all** (disabled when no active filters) + **Done** (accent colour, closes panel)
  - Click-outside backdrop (`z-30`) behind the popup closes it on mousedown
- [x] **KPI count-up animation** — `useCountUp(target, duration=650)` hook. Animates from 0 on mount, between old/new values on filter change. `fromRef = null` reset in cleanup so React 18 Strict Mode double-invocation re-animates correctly. Ease-out cubic via RAF.
- [x] **Auth modal** — Supabase Auth (`@supabase/supabase-js` + `@supabase/ssr`). Email/password sign up + sign in. Google OAuth wired (`signInWithOAuth`) — awaiting credentials. Confirmation email screen replaces form on sign up. `UserMenu` dropdown with avatar initials + sign out. Auth state via `onAuthStateChange`. Supabase session refreshed in `proxy.ts` (Next.js 16 equivalent of middleware). Client: `utils/supabase/client.ts`. Server: `utils/supabase/server.ts`.

## What's next (priority order)

### SaaS — build this to make money

1. **Google OAuth** — Supabase Auth UI is wired. Needs Google Cloud Console Client ID + Secret → paste into Supabase Auth → Providers → Google. Redirect URI: `https://dwohgqlseyvosanitywa.supabase.co/auth/v1/callback`.
2. **Save dashboard (Supabase)** — persist `{ sheetUrl, layout: LayoutItem[] }` to a `dashboards` table. ~4hrs.
3. **Share link** — `/dashboard/[id]` read-only public page, no auth required to view. This is the growth mechanic.
4. **Stripe billing** — $9.99/month. Free tier: 1 saved dashboard. Paid: unlimited. ~3hrs.
5. **Landing page** — DONE. Hero with glow + blue headline, stats strip, dot-grid texture, interactive showcase demo, features, 3-tier pricing with Most Popular badge, FAQ, footer. Create dialog is two-panel (blue brand + white form) with "Notes for AI" field wired into AI prompt.

### Launch readiness

**SEO / meta**
- [ ] Meta title on every page
- [ ] Meta description on every page
- [ ] Open Graph image
- [ ] Favicon set
- [ ] robots.txt
- [ ] sitemap.xml
- [ ] Alt text on every image

**UX / UI**
- [ ] Custom 404 page
- [ ] CTA above the fold on landing page
- [ ] Mobile breakpoints
- [ ] Sticky mobile CTA
- [ ] Loading states
- [ ] Form error states
- [ ] Thank you page
- [ ] Compressed images

**Legal / compliance**
- [ ] Privacy policy page
- [ ] Terms and conditions page
- [ ] Cookie banner
- [ ] Real contact address

**Growth**
- [ ] Analytics installed

**AI generation gotchas**:
- Positions are in SNAP units (integers) in the prompt, multiplied by 24 server-side after parsing
- `rightAlignRows()` nudges the rightmost tile in each row to flush with `MAX_RIGHT` (only if gap ≤ 2 SNAP units)
- Stat card `value` is always computed server-side from real data — never trusted from AI response
- Trend uses `detectGranularity()` (median gap between unique dates) to pick daily/weekly/monthly/yearly comparison period
- `.env.local` is gitignored; `.env.example` documents the required `ANTHROPIC_API_KEY`

## Dev

```bash
# from Dashly/Dashly/
npm run dev
```

Add `ANTHROPIC_API_KEY=sk-ant-...` to `apps/web/.env.local` to enable AI dashboard generation.

## Dev workflow

- **Test after every change** — boot the dev server and manually verify the affected behaviour before reporting a fix as done.
- **Push only on user confirmation** — commit and push to GitHub only after the user has confirmed they're happy with how things are working.

Test data CSVs are in `test-data/` — use `ecommerce_sales.csv` or `sales_pipeline.csv` with a local server, or upload to Google Sheets and paste the share URL.
