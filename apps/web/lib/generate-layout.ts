import Anthropic from "@anthropic-ai/sdk"
import { type ColumnInfo } from "./analyze"
import { type LayoutItem } from "@/components/dashboard-grid"

const S = 24
const CANVAS_UNITS = 48
const MAX_RIGHT = (CANVAS_UNITS - 1) * S  // 1128px

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
    gaps.push((unique[i]! - unique[i - 1]!) / 86_400_000) // days
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
  }
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++)
      if (tilesOverlap(tiles[i]!, tiles[j]!)) return false
  return true
}

export async function generateDashboardLayout(
  columns: ColumnInfo[],
  rows: string[][]
): Promise<LayoutItem[] | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const client    = new Anthropic()
  const sample    = rows.slice(0, 20)
  const colSchema = columns.map(c => `${c.name} (${c.type})`).join(", ")
  const sampleStr = sample.map(r => r.join("\t")).join("\n")
  const colList   = columns.map(c => `"${c.name}"`).join(", ")
  const numCols   = columns.filter(c => c.type === "number").map(c => c.name).join(", ")   || "none"
  const dateCols  = columns.filter(c => c.type === "date").map(c => c.name).join(", ")     || "none"
  const catCols   = columns.filter(c => c.type === "category").map(c => c.name).join(", ") || "none"

  const dateCol     = columns.find(c => c.type === "date")
  const granularity = dateCol ? detectGranularity(rows, dateCol) : null
  const trendPeriod = granularity === "daily"   ? "previous day"
                    : granularity === "weekly"  ? "last week"
                    : granularity === "monthly" ? "last month"
                    : granularity === "yearly"  ? "last year"
                    : null

  const prompt = `You are a BI dashboard layout generator. Return a JSON array of tiles for visualising this dataset.

COLUMNS: ${colSchema}
SAMPLE DATA (tab-separated):
${sampleStr}
${granularity ? `\nDATA GRANULARITY: ${granularity} (detected from date values). Use this when writing chart titles — e.g. "Daily Revenue", "Weekly Orders", etc.` : ""}

CANVAS: ${CANVAS_UNITS} units wide. 1 unit = 24px.
All x, y, w, h values must be positive integers (units).

CONSTRAINTS:
- x ≥ 1, y ≥ 1 (left/top margin)
- x + w ≤ 47 (right boundary — last tile in each row should reach 47)
- Leave at least 1 unit gap between every pair of tiles
- Minimum w=4, h=4. Maximum 8 tiles.

RECOMMENDED SIZES:
- Stat card: w=10–11, h=7
- Line/area/bar chart: h=13, w=14–34
- Pie chart: h=13, w=12–16

EXAMPLE LAYOUT:
Row 1 y=1 h=7:  stat(x=1,w=11), stat(x=13,w=11), stat(x=25,w=11), stat(x=37,w=10)
Row 2 y=9 h=13: line(x=1,w=32), pie(x=34,w=13)
Row 3 y=23 h=13: bar(x=1,w=22), hbar(x=24,w=23)

CHART TYPE RULES:
- "line" or "area": xCol must be a date column [${dateCols}]. Add "smooth":true for line.
- "bar": xCol is a category column [${catCols}]. Add "orientation":"horizontal" for many categories.
- "pie": xCol is a category with ≤6 values. Add "showCenter":true, "showLegend":true.
- "stat": column must be a number column [${numCols}]. Use "sum" for totals, "avg" for rates/margins.
${trendPeriod ? `- Stat card labels should reflect the data granularity, e.g. "Total Revenue (${granularity})" if relevant.` : ""}

TILE SCHEMA:
Stat:  { "id":"s1", "type":"stat",  "x":1,"y":1,"w":11,"h":7,  "stat":  { "column":"Revenue","agg":"sum","label":"Total Revenue" } }
Chart: { "id":"c1", "type":"chart", "x":1,"y":9,"w":32,"h":13, "chart": { "type":"line","xCol":"Date","yCol":"Revenue","agg":"sum","title":"Revenue Over Time","smooth":true } }

Available columns: ${colList}

Return ONLY the JSON array, no other text.`

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })

    const text  = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : ""
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return null

    const raw = JSON.parse(match[0]) as LayoutItem[]
    if (!Array.isArray(raw) || !raw.length) return null

    const scaled = rightAlignRows(
      raw.map(t => ({ ...t, x: t.x * S, y: t.y * S, w: t.w * S, h: t.h * S }))
    )

    if (!validateLayout(scaled, columns)) {
      console.warn("AI returned invalid layout — falling back to empty canvas")
      return null
    }

    const g = granularity ?? "monthly"
    return scaled.map(t => {
      if (t.type === "stat" && t.stat) {
        const value     = computeStatValue(t.stat.column, t.stat.agg, columns, rows)
        const trendData = computeStatTrend(t.stat.column, t.stat.agg, columns, rows, g)
        return { ...t, stat: { ...t.stat, value, ...(trendData ?? {}) } }
      }
      return t
    })
  } catch (e) {
    console.error("Dashboard generation failed:", e)
    return null
  }
}
