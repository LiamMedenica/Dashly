# Dashly

Paste a Google Sheets URL, click **Generate dashboard**, and get a beautiful AI-built interactive dashboard in seconds. No account needed.

## What it does

1. Paste a public Google Sheets share link
2. Click **Generate dashboard →** — Claude Haiku reads your columns and sample data and builds a tailored starting layout automatically
3. Or start blank and drag charts onto the canvas yourself
4. Resize, rearrange, configure — everything is point and click

Try the live demo at `/dashboard?demo=true`.

## Chart types

- **Stat cards** — single KPI with period filter and trend comparison (vs last day/week/month/year)
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
- 6 color palettes (Violet, Sky, Indigo, Rose, Teal, Coral) + custom color picker
- Canvas rescales automatically on window resize

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| Monorepo | Turborepo |
| UI components | Base UI + shadcn Nova preset |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |
| AI | Claude Haiku (Anthropic) |
| Fonts | Geist |

## Getting started

```bash
# Install dependencies
npm install

# Start dev server (from repo root)
npm run dev
```

App runs at `http://localhost:3000`.

To enable AI dashboard generation, add your Anthropic API key to `apps/web/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com). Generation costs ~$0.001 per dashboard.

To test with real data, make a Google Sheet public ("Anyone with the link can view") and paste the URL on the landing page.

## Project structure

```
apps/web/          Next.js app
  app/             Routes (/, /dashboard)
  components/      UI components
  lib/             Sheets fetch, column analysis, palettes, AI generation
packages/ui/       Shared component library (@workspace/ui)
```

## Roadmap

### Canvas features
- [x] **AI dashboard generation** — Claude Haiku reads your data and builds a tailored layout automatically
- [ ] **Cross-chart filters / slicers** — click a bar, pie slice, or data point and every other tile filters to that value. Works like Tableau actions / Power BI slicers.
- [ ] **Text box tile** — drag a free-text tile onto the canvas for labels, section headers, or annotations.
- [ ] **Filter bar** — persistent slicer panel above the canvas that applies a global filter to all tiles at once.

### SaaS
- [ ] Auth (Clerk)
- [ ] Save and share dashboards (gate behind signup)
- [ ] Stripe billing ($9.99/month)
- [ ] Saved dashboard hub (sidebar list of past dashboards)
- [ ] Landing page additions (pricing section, feature screenshots)
