import { AppSidebar } from "@/components/app-sidebar"
import { DashboardShell } from "@/components/dashboard-shell"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { extractSheetId, fetchSheetData } from "@/lib/sheets"
import { analyzeColumns, type ColumnInfo } from "@/lib/analyze"
import { generateDashboardLayout } from "@/lib/generate-layout"
import { type LayoutItem } from "@/components/dashboard-grid"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; name?: string; demo?: string; generate?: string }>
}) {
  const { url, name, demo, generate } = await searchParams

  const isDemo = demo === "true"
  let columns: ColumnInfo[] = []
  let rows: string[][] = []
  let initialLayout: LayoutItem[] | undefined
  let generationError: string | undefined
  const dashboardName = name || (isDemo ? "Sample E-Commerce Dashboard" : "My Dashboard")

  if (!isDemo && url) {
    try {
      const sheetId = extractSheetId(url)
      if (sheetId) {
        const data = await fetchSheetData(sheetId)
        columns = analyzeColumns(data.headers, data.rows)
        rows = data.rows
      }
    } catch (e) {
      console.error("Failed to fetch sheet data:", e)
    }

    if (generate === "true" && columns.length > 0) {
      const result = await generateDashboardLayout(columns, rows)
      if (result.tiles) {
        initialLayout = result.tiles
      } else {
        generationError = result.error
      }
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" dashboardName={dashboardName} sheetUrl={url} columns={columns} />
      <DashboardShell
        dashboardName={dashboardName}
        sheetUrl={url}
        columns={columns}
        rows={rows}
        isDemo={isDemo}
        initialLayout={initialLayout}
        generationError={generationError}
      />
    </SidebarProvider>
  )
}
