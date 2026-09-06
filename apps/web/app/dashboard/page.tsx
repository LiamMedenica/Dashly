import { AppSidebar } from "@/components/app-sidebar"
import { DashboardShell } from "@/components/dashboard-shell"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import { extractSheetId, fetchSheetData } from "@/lib/sheets"
import { analyzeColumns, type ColumnInfo } from "@/lib/analyze"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; name?: string }>
}) {
  const { url, name } = await searchParams

  let columns: ColumnInfo[] = []
  let rows: string[][] = []
  const dashboardName = name || "My Dashboard"

  if (url) {
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
      <DashboardShell dashboardName={dashboardName} sheetUrl={url} columns={columns} rows={rows} />
    </SidebarProvider>
  )
}
