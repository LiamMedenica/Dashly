import { type ColumnInfo } from "@/lib/analyze"
import { type LayoutItem } from "@/components/dashboard-grid"

// Deterministic LCG — identical dataset on every server render.
let _s = 42
function rng() { _s = (_s * 1664525 + 1013904223) & 0x7fffffff; return _s / 0x7fffffff }

const PRODUCTS = [
  { name: "Laptop Pro",     cat: "Electronics", price: 1299, margin: 0.22 },
  { name: "Wireless Mouse", cat: "Electronics", price: 29,   margin: 0.48 },
  { name: "USB Hub",        cat: "Electronics", price: 19,   margin: 0.52 },
  { name: "Monitor 27\"",   cat: "Electronics", price: 399,  margin: 0.28 },
  { name: "Sneakers",       cat: "Clothing",    price: 89,   margin: 0.55 },
  { name: "Hoodie",         cat: "Clothing",    price: 59,   margin: 0.62 },
  { name: "Jeans",          cat: "Clothing",    price: 79,   margin: 0.58 },
  { name: "Coffee Maker",   cat: "Home",        price: 129,  margin: 0.35 },
  { name: "Desk Lamp",      cat: "Home",        price: 45,   margin: 0.44 },
  { name: "Air Purifier",   cat: "Home",        price: 199,  margin: 0.31 },
]
const REGIONS = ["North", "South", "East", "West"]
const DAYS    = [31, 29, 31, 30, 31, 30, 31, 31]

function generateRows(): string[][] {
  const rows: string[][] = []
  for (let m = 1; m <= 8; m++) {
    for (let i = 0; i < 12; i++) {
      const day    = Math.floor(rng() * DAYS[m - 1]!) + 1
      const prod   = PRODUCTS[Math.floor(rng() * PRODUCTS.length)]!
      const region = REGIONS[Math.floor(rng() * REGIONS.length)]!
      const units  = Math.floor(rng() * 4) + 1
      const rev    = (prod.price * units * (0.9 + rng() * 0.2)).toFixed(2)
      const margin = Math.min(0.78, Math.max(0.1, prod.margin * (0.8 + rng() * 0.4))).toFixed(3)
      rows.push([
        `2024-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        prod.name,
        prod.cat,
        region,
        rev,
        String(units),
        margin,
      ])
    }
  }
  return rows.sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""))
}

export const DEMO_COLUMNS: ColumnInfo[] = [
  { name: "Date",     index: 0, type: "date" },
  { name: "Product",  index: 1, type: "category" },
  { name: "Category", index: 2, type: "category" },
  { name: "Region",   index: 3, type: "category" },
  { name: "Revenue",  index: 4, type: "number" },
  { name: "Units",    index: 5, type: "number" },
  { name: "Margin",   index: 6, type: "number" },
]

export const DEMO_ROWS = generateRows()

// Pre-compute aggregates for stat card display values
const totalRev    = DEMO_ROWS.reduce((s, r) => s + parseFloat(r[4] ?? "0"), 0)
const totalUnits  = DEMO_ROWS.reduce((s, r) => s + parseInt(r[5] ?? "0"), 0)
const avgMargin   = DEMO_ROWS.reduce((s, r) => s + parseFloat(r[6] ?? "0"), 0) / DEMO_ROWS.length
const avgOrderVal = totalRev / DEMO_ROWS.length

function fmtRev(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function snap(v: number, s = 24) { return Math.round(v / s) * s }
function snapFloor(v: number, s = 24) { return Math.floor(v / s) * s }

// Builds a responsive layout once the canvas width is known (client-side).
// Every row shares the same left edge (x=S) and the same right edge (x=maxRight),
// so all tiles are flush with each other horizontally.
export function buildDemoLayout(canvasW: number): LayoutItem[] {
  const S = 24
  // All tiles: left edge = S, right edge = maxRight
  const maxRight = canvasW - S
  // Usable inner span (between left margin and right boundary)
  const span = maxRight - S

  // ── Row 1: 4 equal stat cards ─────────────────────────────────────────
  // 4*statW + 3*S (gaps) = span  →  statW = (span - 3*S) / 4
  const statH = 6 * S  // 144px
  const statW = snapFloor((span - 3 * S) / 4)
  const row1Y = S

  // ── Row 2: line chart (left) + pie chart (right) ──────────────────────
  // lineW + S (gap) + pieW = span  →  lineW = span - S - pieW
  const row2Y  = row1Y + statH + S
  const chartH = 13 * S  // 312px
  const pieW   = snap(span * 0.30)
  const lineW  = span - S - pieW
  const pieX   = S + lineW + S

  // ── Row 3: category bar (left) + product bar (right), equal halves ────
  // halfW + S (gap) + half2W = span  →  half2W = span - S - halfW
  const row3Y  = row2Y + chartH + S
  const row3H  = 13 * S  // 312px
  const halfW  = snapFloor((span - S) / 2)
  const half2X = S + halfW + S
  const half2W = span - S - halfW

  return [
    // Row 1 — 4 stat cards, all same width
    {
      id: "demo-stat-rev", x: S, y: row1Y, w: statW, h: statH, type: "stat",
      stat: { column: "Revenue", agg: "sum", label: "Total Revenue", value: fmtRev(totalRev), trend: "+12.4%", trendUp: true, trendLabel: "vs last quarter" },
    },
    {
      id: "demo-stat-units", x: S + (statW + S), y: row1Y, w: statW, h: statH, type: "stat",
      stat: { column: "Units", agg: "sum", label: "Units Sold", value: totalUnits.toLocaleString(), trend: "+8.1%", trendUp: true, trendLabel: "vs last quarter" },
    },
    {
      id: "demo-stat-aov", x: S + 2 * (statW + S), y: row1Y, w: statW, h: statH, type: "stat",
      stat: { column: "Revenue", agg: "avg", label: "Avg Order Value", value: fmtRev(avgOrderVal), trend: "+3.7%", trendUp: true, trendLabel: "vs last quarter" },
    },
    {
      id: "demo-stat-margin", x: S + 3 * (statW + S), y: row1Y, w: statW, h: statH, type: "stat",
      stat: { column: "Margin", agg: "avg", label: "Avg Profit Margin", value: `${(avgMargin * 100).toFixed(1)}%`, trend: "-1.2%", trendUp: false, trendLabel: "vs last quarter" },
    },
    // Row 2 — line + pie, right edge of pie = maxRight
    {
      id: "demo-chart-line", x: S, y: row2Y, w: lineW, h: chartH, type: "chart",
      chart: { type: "line", xCol: "Date", yCol: "Revenue", agg: "sum", title: "Revenue Over Time", smooth: true },
    },
    {
      id: "demo-chart-pie", x: pieX, y: row2Y, w: pieW, h: chartH, type: "chart",
      chart: { type: "pie", xCol: "Region", yCol: "Revenue", agg: "sum", title: "Revenue by Region", showCenter: true, showLegend: true },
    },
    // Row 3 — two bar charts side by side, right edge of bar2 = maxRight
    {
      id: "demo-chart-bar-cat", x: S, y: row3Y, w: halfW, h: row3H, type: "chart",
      chart: { type: "bar", xCol: "Category", yCol: "Revenue", agg: "sum", title: "Revenue by Category" },
    },
    {
      id: "demo-chart-bar-prod", x: half2X, y: row3Y, w: half2W, h: row3H, type: "chart",
      chart: { type: "bar", xCol: "Product", yCol: "Revenue", agg: "sum", title: "Top Products by Revenue", orientation: "horizontal" },
    },
  ]
}
