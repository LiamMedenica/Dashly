# Dashly

"Tableau but in 2026" — paste a Google Sheets URL → auto-generate an interactive dashboard → share with team → $9.99/month.

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
  - On drop: compute natural escape direction (vector from B center to C center, dominant axis)
  - If escape is free → C slides away, B lands where dropped (push/slide)
  - If escape is blocked (corner/wall) → halfway threshold on B's center inside C's bounds:
    - B center outside C → bounce B back to origin
    - B center inside C → swap: B takes C's slot, C resolves to nearest free position

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
- [x] Push/slide: free items slide away via natural escape direction vector
- [x] Bounce/swap: cornered items bounce B back (<halfway) or swap positions (>halfway)
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

## What's next (priority order)

1. Auth — Clerk or NextAuth
2. Share flow — gate behind signup
3. Stripe billing — $9.99/month
4. Saved dashboard hub (sidebar list)
5. Cross-chart filters
6. Landing page additions (pricing, feature screenshots)

## Dev

```bash
# from Dashly/Dashly/
npm run dev
```

Test data CSVs are in `test-data/` — use `ecommerce_sales.csv` or `sales_pipeline.csv` with a local server, or upload to Google Sheets and paste the share URL.
