import { type ColumnInfo } from "@/lib/analyze"
import { type LayoutItem } from "@/components/dashboard-grid"

// Deterministic LCG — identical dataset on every server render.
let _s = 17
function rng() { _s = (_s * 1664525 + 1013904223) & 0x7fffffff; return _s / 0x7fffffff }

// "The Crumb" — a one-person sourdough micro-bakery attending 3 weekly farmers markets.
const MARKETS = [
  { name: "Greenfield Sunday",  bump: 1.14 },
  { name: "Riverside Saturday", bump: 1.00 },
  { name: "Old Town Friday",    bump: 0.79 },
]

const LOAVES = [
  { name: "Country Sourdough",  price: 7.00, base: 24 },
  { name: "Seeded Rye",         price: 8.00, base: 15 },
  { name: "Jalapeño Cheddar",   price: 9.00, base: 12 },
  { name: "Olive & Herb",       price: 8.50, base: 10 },
  { name: "Cinnamon Walnut",    price: 7.50, base: 9  },
]

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31]

function generateRows(): string[][] {
  const rows: string[][] = []
  for (let m = 1; m <= 8; m++) {
    for (let i = 0; i < 12; i++) {
      const day    = Math.floor(rng() * DAYS_IN_MONTH[m - 1]!) + 1
      const market = MARKETS[Math.floor(rng() * MARKETS.length)]!
      const loaf   = LOAVES[Math.floor(rng() * LOAVES.length)]!
      const baked  = Math.round(loaf.base * market.bump * (0.75 + rng() * 0.5))
      const sold   = Math.min(baked, Math.round(baked * (0.62 + rng() * 0.32)))
      const waste  = baked - sold
      const revenue = (sold * loaf.price * (0.97 + rng() * 0.06)).toFixed(2)
      rows.push([
        `2024-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        market.name,
        loaf.name,
        String(sold),
        revenue,
        String(waste),
      ])
    }
  }
  return rows.sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""))
}

export const DEMO_COLUMNS: ColumnInfo[] = [
  { name: "Date",     index: 0, type: "date"     },
  { name: "Market",   index: 1, type: "category" },
  { name: "Loaf",     index: 2, type: "category" },
  { name: "Sold",     index: 3, type: "number"   },
  { name: "Revenue",  index: 4, type: "number"   },
  { name: "Waste",    index: 5, type: "number"   },
]

export const DEMO_ROWS = generateRows()

function monthStats(prefix: string) {
  const rows  = DEMO_ROWS.filter(r => (r[0] ?? "").startsWith(prefix))
  const sold  = rows.reduce((s, r) => s + parseInt(r[3]  ?? "0"), 0)
  const rev   = rows.reduce((s, r) => s + parseFloat(r[4] ?? "0"), 0)
  const waste = rows.reduce((s, r) => s + parseInt(r[5]  ?? "0"), 0)
  return { sold, rev, waste, avgPerLoaf: sold > 0 ? rev / sold : 0 }
}

const aug = monthStats("2024-08")
const jul = monthStats("2024-07")

function momPct(cur: number, prev: number) {
  if (!prev) return "+0.0%"
  const pct = (cur - prev) / prev * 100
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
}

function fmtGBP(n: number) {
  if (n >= 1_000) return `£${(n / 1_000).toFixed(1)}K`
  return `£${n.toFixed(0)}`
}

function snap(v: number, s = 24) { return Math.round(v / s) * s }
function snapFloor(v: number, s = 24) { return Math.floor(v / s) * s }

export function buildDemoLayout(canvasW: number): LayoutItem[] {
  const S = 24
  const span = canvasW - 2 * S

  // Row 0 — title
  const titleH = 3 * S
  const titleY = S

  // Row 1 — 4 stat cards (first 3 equal, last takes remaining space to flush right)
  const statH   = 6 * S
  const statW   = snapFloor((span - 3 * S) / 4)
  const lastStatW = span - 3 * (statW + S)
  const row1Y   = titleY + titleH + S

  // Row 2 — line chart (left) + pie chart (right)
  const row2Y  = row1Y + statH + S
  const chartH = 13 * S
  const pieW   = snap(span * 0.30)
  const lineW  = span - S - pieW
  const pieX   = S + lineW + S

  // Row 3 — two bar charts
  const row3Y  = row2Y + chartH + S
  const row3H  = 13 * S
  const halfW  = snapFloor((span - S) / 2)
  const half2X = S + halfW + S
  const half2W = span - S - halfW

  return [
    // Title
    {
      id: "demo-text-title", x: S, y: titleY, w: span, h: titleH, type: "text",
      text: { content: "<h1>The Crumb · Micro-Bakery</h1><p>Farmers market performance · Greenfield, Riverside & Old Town · 2024 season</p>" },
    },
    // Stat cards — show August (latest month) values with MoM comparison
    {
      id: "demo-stat-rev", x: S, y: row1Y, w: statW, h: statH, type: "stat",
      stat: { column: "Revenue", agg: "sum", label: "Aug Revenue", value: fmtGBP(aug.rev), filter: "this_month", trend: momPct(aug.rev, jul.rev), trendUp: aug.rev >= jul.rev, trendLabel: "vs last month" },
    },
    {
      id: "demo-stat-sold", x: S + (statW + S), y: row1Y, w: statW, h: statH, type: "stat",
      stat: { column: "Sold", agg: "sum", label: "Loaves Sold", value: String(aug.sold), filter: "this_month", trend: momPct(aug.sold, jul.sold), trendUp: aug.sold >= jul.sold, trendLabel: "vs last month" },
    },
    {
      id: "demo-stat-waste", x: S + 2 * (statW + S), y: row1Y, w: statW, h: statH, type: "stat",
      stat: { column: "Waste", agg: "sum", label: "Waste (Loaves)", value: String(aug.waste), filter: "this_month", trend: momPct(aug.waste, jul.waste), trendUp: aug.waste <= jul.waste, trendLabel: "vs last month" },
    },
    {
      id: "demo-stat-apl", x: S + 3 * (statW + S), y: row1Y, w: lastStatW, h: statH, type: "stat",
      stat: { column: "Revenue", agg: "avg", label: "Avg £ per Loaf", value: `£${aug.avgPerLoaf.toFixed(2)}`, filter: "this_month", trend: momPct(aug.avgPerLoaf, jul.avgPerLoaf), trendUp: aug.avgPerLoaf >= jul.avgPerLoaf, trendLabel: "vs last month" },
    },
    // Line + pie
    {
      id: "demo-chart-line", x: S, y: row2Y, w: lineW, h: chartH, type: "chart",
      chart: { type: "line", xCol: "Date", yCol: "Revenue", agg: "sum", title: "Weekly Revenue", smooth: true },
    },
    {
      id: "demo-chart-pie", x: pieX, y: row2Y, w: pieW, h: chartH, type: "chart",
      chart: { type: "pie", xCol: "Market", yCol: "Revenue", agg: "sum", title: "Revenue by Market", showCenter: true, showLegend: true },
    },
    // Two bars
    {
      id: "demo-chart-bar-loaf", x: S, y: row3Y, w: halfW, h: row3H, type: "chart",
      chart: { type: "bar", xCol: "Loaf", yCol: "Revenue", agg: "sum", title: "Revenue by Loaf Type", orientation: "horizontal" },
    },
    {
      id: "demo-chart-bar-waste", x: half2X, y: row3Y, w: half2W, h: row3H, type: "chart",
      chart: { type: "bar", xCol: "Loaf", yCol: "Waste", agg: "sum", title: "Waste by Loaf Type" },
    },
  ]
}
