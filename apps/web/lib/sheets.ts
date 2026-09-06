export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] ?? null
}

export async function fetchSheetData(sheetId: string): Promise<{
  headers: string[]
  rows: string[][]
}> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(csvUrl, { cache: "no-store", signal: controller.signal })
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`)
    const text = await res.text()
    return parseCSV(text)
  } finally {
    clearTimeout(timeout)
  }
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n")
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0]!)
  const rows = lines.slice(1).filter(l => l.trim()).map(parseLine)
  return { headers, rows }
}
