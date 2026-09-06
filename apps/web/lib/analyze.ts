export type ColumnType = "date" | "number" | "category" | "text" | "id"

export interface ColumnInfo {
  name: string
  type: ColumnType
  index: number
}

// Columns that are identifiers — skip for charting
const ID_PATTERNS = /\b(id|code|ref|no|num|number|sku|uuid|key|hash)\b/i

function parseNum(v: string): number {
  return parseFloat(v.replace(/[$€£¥₹,%\s]/g, "").replace(/,/g, ""))
}

function isDate(v: string): boolean {
  if (v.length < 4) return false
  // ISO dates: 2026-01-03
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return true
  // DD/MM/YYYY or MM/DD/YYYY
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(v)) return true
  // "Jan 2026", "January 2026", "Jan 26"
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(v)) return true
  // "2026-01", "2026/01"
  if (/^\d{4}[\/\-]\d{2}$/.test(v)) return true
  return false
}

function detectType(name: string, values: string[]): ColumnType {
  if (ID_PATTERNS.test(name)) return "id"

  const nonEmpty = values.filter(v => v.length > 0)
  if (nonEmpty.length === 0) return "text"

  const dateCount = nonEmpty.filter(isDate).length
  if (dateCount / nonEmpty.length > 0.7) return "date"

  const numCount = nonEmpty.filter(v => !isNaN(parseNum(v))).length
  if (numCount / nonEmpty.length > 0.7) return "number"

  const unique = new Set(nonEmpty)
  // Category: few unique values, or <30% uniqueness
  if (unique.size <= 20 || unique.size / nonEmpty.length < 0.3) return "category"

  return "text"
}

export function analyzeColumns(headers: string[], rows: string[][]): ColumnInfo[] {
  return headers.map((name, index) => ({
    name,
    type: detectType(name, rows.map(r => r[index] ?? "")),
    index,
  }))
}
