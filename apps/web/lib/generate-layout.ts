import Anthropic from "@anthropic-ai/sdk"
import { type ColumnInfo } from "./analyze"
import { type LayoutItem } from "@/components/dashboard-grid"

const S = 24
const CANVAS_UNITS = 66  // matches LOGICAL_W (67*24=1608) minus one SNAP for right margin
const MAX_RIGHT = (CANVAS_UNITS - 1) * S  // 1560px

type Granularity = "daily" | "weekly" | "monthly" | "yearly"

function parseNum(v: string) {
  return parseFloat(v.replace(/[$€£¥₹,%\s]/g, "").replace(/,/g, ""))
}

function applyAgg(agg: string, vals: number[], rowCount: number): number {
  switch (agg) {
    case "sum":   return vals.reduce((a, b) => a + b, 0)
    case "avg":   return vals.reduce((a, b) => a + b, 0) / vals.length
    case "count": return rowCount
    case "max":   return Math.max(...vals)
    case "min":   return Math.min(...vals)
    default:      return 0
  }
}

function formatValue(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// Detect time granularity by looking at the median gap between consecutive unique dates.
function detectGranularity(rows: string[][], dateCol: ColumnInfo): Granularity {
  const timestamps = rows
    .map(r => new Date(r[dateCol.index] ?? "").getTime())
    .filter(t => !isNaN(t))
  const unique = [...new Set(timestamps)].sort((a, b) => a - b)
  if (unique.length < 2) return "monthly"

  const gaps: number[] = []
  for (let i = 1; i < Math.min(unique.length, 30); i++) {
    gaps.push((unique[i]! - unique[i - 1]!) / 86_400_000)
  }
  gaps.sort((a, b) => a - b)
  const median = gaps[Math.floor(gaps.length / 2)]!

  if (median <= 1.5) return "daily"
  if (median <= 9)   return "weekly"
  if (median <= 45)  return "monthly"
  return "yearly"
}

function weekOf(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - start.getTime()) / 86_400_000 + start.getDay() + 1) / 7)
}

// Rich per-column summary so the model understands the actual data distribution.
function summarizeColumns(columns: ColumnInfo[], rows: string[][]): string {
  return columns.map(col => {
    if (col.type === "number") {
      const vals = rows.map(r => parseNum(r[col.index] ?? "")).filter(n => isFinite(n))
      if (!vals.length) return `  ${col.name} (number): no valid values`
      const sum = vals.reduce((a, b) => a + b, 0)
      return `  ${col.name} (number): count=${vals.length}, sum=${formatValue(sum)}, avg=${formatValue(sum / vals.length)}, min=${formatValue(Math.min(...vals))}, max=${formatValue(Math.max(...vals))}`
    }
    if (col.type === "date") {
      const dates = rows.map(r => new Date(r[col.index] ?? "")).filter(d => !isNaN(d.getTime()))
      if (!dates.length) return `  ${col.name} (date): no valid dates`
      const minD = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().slice(0, 10)
      const maxD = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().slice(0, 10)
      return `  ${col.name} (date): ${dates.length} records, range ${minD} → ${maxD}`
    }
    if (col.type === "category") {
      const counts = new Map<string, number>()
      rows.forEach(r => { const v = r[col.index] ?? ""; counts.set(v, (counts.get(v) ?? 0) + 1) })
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
      const top5 = sorted.slice(0, 5).map(([v, n]) => `"${v}"(${n})`).join(", ")
      const more = sorted.length > 5 ? ` + ${sorted.length - 5} more` : ""
      return `  ${col.name} (category): ${sorted.length} unique — ${top5}${more}`
    }
    return `  ${col.name} (${col.type})`
  }).join("\n")
}

function computeStatValue(column: string, agg: string, columns: ColumnInfo[], rows: string[][]): string {
  const col = columns.find(c => c.name === column)
  if (!col) return "—"
  if (agg === "count") return rows.length.toLocaleString()
  const vals = rows.map(r => parseNum(r[col.index] ?? "")).filter(n => isFinite(n))
  if (!vals.length) return "—"
  return formatValue(applyAgg(agg, vals, rows.length))
}

function computeStatTrend(
  column: string,
  agg: string,
  columns: ColumnInfo[],
  rows: string[][],
  granularity: Granularity
): { trend: string; trendUp: boolean; trendLabel: string } | null {
  const dateCol = columns.find(c => c.type === "date")
  const col     = columns.find(c => c.name === column)
  if (!dateCol || !col || agg === "count") return null

  const parsed = rows
    .map(r => ({ date: new Date(r[dateCol.index] ?? ""), val: parseNum(r[col.index] ?? "") }))
    .filter(x => !isNaN(x.date.getTime()) && isFinite(x.val))
  if (!parsed.length) return null

  const maxDate = new Date(Math.max(...parsed.map(x => x.date.getTime())))
  let current: typeof parsed, prev: typeof parsed, trendLabel: string

  if (granularity === "daily") {
    const DAY = 86_400_000
    const currDay = Math.floor(maxDate.getTime() / DAY)
    current    = parsed.filter(x => Math.floor(x.date.getTime() / DAY) === currDay)
    prev       = parsed.filter(x => Math.floor(x.date.getTime() / DAY) === currDay - 1)
    trendLabel = "vs previous day"
  } else if (granularity === "weekly") {
    const cw = weekOf(maxDate), cy = maxDate.getFullYear()
    const prevWeekDate = new Date(maxDate); prevWeekDate.setDate(prevWeekDate.getDate() - 7)
    const pw = weekOf(prevWeekDate), py = prevWeekDate.getFullYear()
    current    = parsed.filter(x => weekOf(x.date) === cw && x.date.getFullYear() === cy)
    prev       = parsed.filter(x => weekOf(x.date) === pw && x.date.getFullYear() === py)
    trendLabel = "vs last week"
  } else if (granularity === "monthly") {
    const cm = maxDate.getMonth(), cy = maxDate.getFullYear()
    const pm = cm === 0 ? 11 : cm - 1
    const py = cm === 0 ? cy - 1 : cy
    current    = parsed.filter(x => x.date.getMonth() === cm && x.date.getFullYear() === cy)
    prev       = parsed.filter(x => x.date.getMonth() === pm && x.date.getFullYear() === py)
    trendLabel = "vs last month"
  } else {
    const cy = maxDate.getFullYear()
    current    = parsed.filter(x => x.date.getFullYear() === cy)
    prev       = parsed.filter(x => x.date.getFullYear() === cy - 1)
    trendLabel = "vs last year"
  }

  if (!current.length || !prev.length) return null

  const currVal = applyAgg(agg, current.map(x => x.val), current.length)
  const prevVal = applyAgg(agg, prev.map(x => x.val), prev.length)
  if (prevVal === 0) return null

  const pct     = ((currVal - prevVal) / Math.abs(prevVal)) * 100
  const trendUp = pct >= 0
  return {
    trend:      `${trendUp ? "+" : ""}${pct.toFixed(1)}%`,
    trendUp,
    trendLabel,
  }
}

function rightAlignRows(tiles: LayoutItem[]): LayoutItem[] {
  const byRow = new Map<number, LayoutItem[]>()
  for (const t of tiles) {
    const g = byRow.get(t.y) ?? []; g.push(t); byRow.set(t.y, g)
  }
  return tiles.map(t => {
    const rowTiles = byRow.get(t.y)!
    const rightEdge = t.x + t.w
    const isRightmost = rowTiles.every(o => o.x + o.w <= rightEdge)
    const gap = MAX_RIGHT - rightEdge
    return isRightmost && gap > 0 && gap <= 2 * S ? { ...t, w: t.w + gap } : t
  })
}

function tilesOverlap(a: LayoutItem, b: LayoutItem): boolean {
  return (
    a.x           < b.x + b.w + S &&
    a.x + a.w + S > b.x           &&
    a.y           < b.y + b.h + S &&
    a.y + a.h + S > b.y
  )
}

function validateLayout(tiles: LayoutItem[], columns: ColumnInfo[]): boolean {
  const colNames = new Set(columns.map(c => c.name))
  for (const t of tiles) {
    if (t.x < S || t.y < S) return false
    if (t.x + t.w > MAX_RIGHT) return false
    if (t.w < S * 3 || t.h < S * 3) return false
    if (t.type === "stat"  && !colNames.has(t.stat?.column ?? "")) return false
    if (t.type === "chart" && (!colNames.has(t.chart?.xCol ?? "") || !colNames.has(t.chart?.yCol ?? ""))) return false
    if (t.type === "table" && !(t.table?.cols ?? []).every(c => colNames.has(c))) return false
  }
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++)
      if (tilesOverlap(tiles[i]!, tiles[j]!)) return false
  return true
}

type GenerateResult =
  | { tiles: LayoutItem[]; error: null }
  | { tiles: null; error: string }

export async function generateDashboardLayout(
  columns: ColumnInfo[],
  rows: string[][]
): Promise<GenerateResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { tiles: null, error: "AI generation is not configured — ANTHROPIC_API_KEY is missing." }
  }

  const client      = new Anthropic()
  const colList     = columns.map(c => `"${c.name}"`).join(", ")
  const colSummary  = summarizeColumns(columns, rows)
  const sample      = rows.slice(0, 12)
  const header      = columns.map(c => c.name).join("\t")
  const sampleStr   = [header, ...sample.map(r => r.join("\t"))].join("\n")
  const dateCol     = columns.find(c => c.type === "date")
  const granularity = dateCol ? detectGranularity(rows, dateCol) : null

  const prompt = `Here is a dataset. Study it carefully, then design a custom dashboard that best communicates what this data is about.

COLUMN STATISTICS (${rows.length} total rows):
${colSummary}

SAMPLE ROWS (tab-separated):
${sampleStr}
${granularity ? `\nDATE GRANULARITY: ${granularity} — use in chart titles (e.g. "Monthly Revenue", "Weekly Orders")` : ""}

---

CANVAS: ${CANVAS_UNITS} units wide. 1 unit = 24px. Coordinates start at (1,1).

HARD CONSTRAINTS:
- x ≥ 1, y ≥ 1
- x + w ≤ ${CANVAS_UNITS - 1} (last tile per row should reach ~${CANVAS_UNITS - 1})
- At least 1 unit gap between every pair of tiles
- Minimum w=4, h=4

RECOMMENDED SIZES (these are starting points, not rules — adapt to the data):
- Stat card: w=10–14, h=7 (never less than h=7)
- Line / area chart: w=28–48, h=12–15 (wide and relatively shallow — trends read better stretched horizontally)
- Bar chart (vertical): w=18–30, h=14–18 (taller than wide — bars need vertical room)
- Bar chart (horizontal): w=30–46, h=13–17 (wider, since labels are on the left)
- Pie chart: w=14–20, h=13–16 (roughly square — circular charts look wrong if too rectangular)
- Table: w=44–64, h=13–17

TILE SCHEMAS:

Stat:  { "id":"s1", "type":"stat", "x":1,"y":1,"w":11,"h":7, "stat":{ "column":"Revenue","agg":"sum","label":"Total Revenue" } }
  agg: "sum" | "avg" | "count" | "min" | "max"
  column must be numeric

Chart: { "id":"c1", "type":"chart", "x":1,"y":9,"w":32,"h":13, "chart":{ "type":"line","xCol":"Date","yCol":"Revenue","agg":"sum","title":"Revenue Over Time" } }
  chart.type options and when to use each:

  "line" — trends over time; xCol must be a date column
    "smooth": true → curved lines (better for continuous trends like revenue or temperature)
    "smooth": false → angular/stepped (better for discrete counts or volatile data)
    "showLabels": true → show value at each point (use when the dataset has few points and exact values matter)
    "yCol2": "<column>" → second line on same axis (use to compare two related metrics over time, e.g. Revenue vs. Target, New Users vs. Churned)
    "showLegend": true → required when using yCol2 so the viewer knows which line is which

  "area" — filled trends; xCol must be a date column; more visual weight than line, good for volume/accumulation
    "smooth": true → curved fill
    "yCol2": "<column>" → second filled area
    "stacked": true → stack yCol2 on top of yCol (use when both series are components of the same total, e.g. Mobile + Desktop traffic)
    "showLegend": true → required when using yCol2

  "bar" — comparisons across categories; xCol is a category column
    "orientation": "horizontal" → better when category names are long or there are many categories (>5)
    "orientation": "vertical" → default; better for few categories with short names

  "pie" — part-of-whole composition; xCol must be a low-cardinality category (≤6 values); only use when proportions genuinely matter
    "showCenter": true → donut style with total in center
    "showLegend": true → color legend (always add for pie)

  agg applies to yCol (and yCol2 if present): "sum" | "avg" | "count" | "min" | "max"

Table: { "id":"t1", "type":"table", "x":1,"y":37,"w":46,"h":13, "table":{ "title":"Orders","cols":["Date","Product","Revenue"] } }
  cols must be exact column names from the dataset; choose the most informative subset

Available columns: ${colList}

---

Respond in this exact format — no other text:

<analysis>
What domain/business is this data from? What are the 2-3 most important things a viewer needs to understand? Why did you choose this specific set of tiles?
</analysis>
<layout>
[JSON array of tiles]
</layout>`

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: "You are a senior data analyst and dashboard designer. You create bespoke dashboards that reveal the story hidden in each unique dataset. You never follow a template — every dashboard you design is tailored to what the specific data is actually about and what a viewer needs to understand at a glance.",
      messages: [{ role: "user", content: prompt }],
    })

    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : ""

    const layoutMatch = text.match(/<layout>([\s\S]*?)<\/layout>/)
    if (!layoutMatch) return { tiles: null, error: "AI returned an unreadable response. Please try again." }

    const raw = JSON.parse(layoutMatch[1]!.trim()) as LayoutItem[]
    if (!Array.isArray(raw) || !raw.length) return { tiles: null, error: "AI returned an empty layout. Please try again." }

    const scaled = rightAlignRows(
      raw.map(t => ({ ...t, x: t.x * S, y: t.y * S, w: t.w * S, h: t.h * S }))
    )

    if (!validateLayout(scaled, columns)) {
      console.warn("AI returned invalid layout — falling back to empty canvas")
      return { tiles: null, error: "AI returned an invalid layout. Please try again." }
    }

    const g = granularity ?? "monthly"
    const tiles = scaled.map(t => {
      if (t.type === "stat" && t.stat) {
        const value     = computeStatValue(t.stat.column, t.stat.agg, columns, rows)
        const trendData = computeStatTrend(t.stat.column, t.stat.agg, columns, rows, g)
        return { ...t, stat: { ...t.stat, value, ...(trendData ?? {}) } }
      }
      return t
    })
    return { tiles, error: null }
  } catch (e) {
    console.error("Dashboard generation failed:", e)
    return { tiles: null, error: "Dashboard generation failed. Please try again." }
  }
}
