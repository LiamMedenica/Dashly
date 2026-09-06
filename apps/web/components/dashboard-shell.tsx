"use client"

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { DashboardGrid } from "@/components/dashboard-grid"
import { SidebarInset } from "@workspace/ui/components/sidebar"
import { type ColumnInfo } from "@/lib/analyze"
import { DEFAULT_PALETTE_ID } from "@/lib/palettes"

export function DashboardShell({
  dashboardName,
  sheetUrl,
  columns,
  rows,
}: {
  dashboardName: string
  sheetUrl?: string
  columns: ColumnInfo[]
  rows: string[][]
}) {
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE_ID)

  return (
    <SidebarInset>
      <SiteHeader
        dashboardName={dashboardName}
        sheetUrl={sheetUrl}
        paletteId={paletteId}
        onPaletteChange={setPaletteId}
      />
      <div className="flex flex-1 flex-col">
        <DashboardGrid columns={columns} rows={rows} paletteId={paletteId} />
      </div>
    </SidebarInset>
  )
}
