"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Sun, PencilIcon } from "lucide-react"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Button } from "@workspace/ui/components/button"
import { COLOR_PALETTES } from "@/lib/palettes"

export function SiteHeader({
  dashboardName = "My Dashboard",
  sheetUrl,
  paletteId,
  onPaletteChange,
}: {
  dashboardName?: string
  sheetUrl?: string
  paletteId?: string
  onPaletteChange?: (id: string) => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(dashboardName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setValue(dashboardName) }, [dashboardName])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function save() {
    setEditing(false)
    const trimmed = value.trim() || "My Dashboard"
    setValue(trimmed)
    const params = new URLSearchParams()
    if (sheetUrl) params.set("url", sheetUrl)
    if (trimmed !== "My Dashboard") params.set("name", trimmed)
    router.replace(`/dashboard${params.size ? `?${params}` : ""}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save()
    if (e.key === "Escape") { setValue(dashboardName); setEditing(false) }
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />

        <div className="flex items-center gap-1.5 flex-1 min-w-0 group/title">
          <input
            ref={inputRef}
            value={value}
            readOnly={!editing}
            onChange={e => setValue(e.target.value)}
            onBlur={editing ? save : undefined}
            onKeyDown={editing ? onKeyDown : undefined}
            onMouseDown={!editing ? e => { e.preventDefault(); setEditing(true) } : undefined}
            className={`bg-transparent outline-none field-sizing-content px-1.5 py-0.5 rounded-md transition-[box-shadow] min-w-0 ${
              editing
                ? "text-[17px] font-medium ring-1 ring-muted-foreground/25 cursor-text"
                : "text-base font-medium ring-0 cursor-pointer hover:opacity-70"
            }`}
          />
          {!editing && (
            <button
              onMouseDown={e => { e.preventDefault(); setEditing(true) }}
              className="opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0"
            >
              <PencilIcon className="size-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {onPaletteChange && (
          <div className="flex items-center gap-1.5 ml-auto">
            {COLOR_PALETTES.map(p => {
              const color = resolvedTheme === "dark" ? p.primary.dark : p.primary.light
              const isSelected = paletteId === p.id
              return (
                <button
                  key={p.id}
                  title={p.label}
                  onClick={() => onPaletteChange(p.id)}
                  className="size-4 rounded-full transition-all shrink-0"
                  style={{
                    background: color,
                    outline: isSelected ? `2px solid ${color}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              )
            })}
            <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-auto" />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className={onPaletteChange ? "" : "ml-auto shrink-0"}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}
