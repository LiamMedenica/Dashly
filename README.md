# Dashly

Paste a Google Sheets URL, get a beautiful interactive dashboard. No account needed to get started.

## What it does

1. Paste a public Google Sheets share link
2. Dashly auto-detects your columns (dates, numbers, categories)
3. Drag charts and stat cards onto the canvas
4. Resize, rearrange, configure — everything is point and click

## Chart types

- **Stat cards** — single KPI with period filter and trend comparison
- **Bar charts** — vertical or horizontal, with aggregation and period filter
- **Line charts** — smooth or linear, optional second series, data labels
- **Area charts** — gradient fill, optional second series, stack toggle
- **Pie charts** — donut style, center total, color legend
- **Tables** — column picker, period filter, sticky header, 100-row limit

## Canvas

- Drag any chart type from the sidebar onto the canvas
- 8-handle resize on every tile
- Collision detection — tiles push, slide, bounce, or swap on drop
- Right-click any tile for Duplicate / Edit / Delete
- 6 color palettes (Slate, Indigo, Teal, Rose, Amber, Emerald) via the header toolbar

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| Monorepo | Turborepo |
| UI components | Base UI + shadcn Nova preset |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |
| Fonts | Geist |

## Getting started

```bash
# Install dependencies
npm install

# Start dev server (from repo root)
npm run dev
```

App runs at `http://localhost:3000`.

To test with real data, make a Google Sheet public ("Anyone with the link can view") and paste the URL on the landing page.

## Project structure

```
apps/web/          Next.js app
  app/             Routes (/, /dashboard)
  components/      UI components
  lib/             Sheets fetch, column analysis, color palettes
packages/ui/       Shared component library (@workspace/ui)
```

## Roadmap

- [ ] Auth (Clerk)
- [ ] Save and share dashboards
- [ ] Stripe billing ($9.99/month)
- [ ] Saved dashboard hub
- [ ] Cross-chart filters
