"use client"

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { DashboardGrid } from "@/components/dashboard-grid"
import { SidebarInset } from "@workspace/ui/components/sidebar"
import { type ColumnInfo } from "@/lib/analyze"
import { DEFAULT_PALETTE_ID } from "@/lib/palettes"
import { DEMO_COLUMNS, DEMO_ROWS, buildDemoLayout } from "@/lib/demo-data"
import { type LayoutItem } from "@/components/dashboard-grid"

export function DashboardShell({
  dashboardName,
  sheetUrl,
  columns,
  rows,
  isDemo,
  initialLayout,
}: {
  dashboardName: string
  sheetUrl?: string
  columns: ColumnInfo[]
  rows: string[][]
  isDemo?: boolean
  initialLayout?: LayoutItem[]
}) {
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE_ID)
  const [customColor, setCustomColor] = useState("#6366f1")

  const effectiveColumns = isDemo ? DEMO_COLUMNS : columns
  const effectiveRows    = isDemo ? DEMO_ROWS    : rows

  return (
    <SidebarInset>
      <SiteHeader
        dashboardName={dashboardName}
        sheetUrl={sheetUrl}
        paletteId={paletteId}
        onPaletteChange={setPaletteId}
        customColor={customColor}
        onCustomColorChange={color => { setCustomColor(color); setPaletteId("custom") }}
      />
      <div className="flex flex-1 flex-col">
        <DashboardGrid
          columns={effectiveColumns}
          rows={effectiveRows}
          paletteId={paletteId}
          customColor={customColor}
          initialLayout={isDemo ? undefined : initialLayout}
          initialLayoutFn={isDemo ? buildDemoLayout : undefined}
        />
      </div>
    </SidebarInset>
  )
}
