"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Sun, PencilIcon, Palette } from "lucide-react"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Button } from "@workspace/ui/components/button"
import { COLOR_PALETTES } from "@/lib/palettes"

const QUICK_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#ec4899", "#64748b", "#a16207",
]

const HUE_GRADIENT =
  "linear-gradient(to right," +
  "hsl(0,100%,50%),hsl(30,100%,50%),hsl(60,100%,50%),hsl(90,100%,50%)," +
  "hsl(120,100%,50%),hsl(150,100%,50%),hsl(180,100%,50%),hsl(210,100%,50%)," +
  "hsl(240,100%,50%),hsl(270,100%,50%),hsl(300,100%,50%),hsl(330,100%,50%)," +
  "hsl(360,100%,50%))"

function hsvToHex(h: number, s: number, v: number): string {
  const i = Math.floor(h / 60) % 6
  const f = h / 60 - Math.floor(h / 60)
  const [p, q, t] = [v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)]
  const rgb = [[v, q, p, p, t, v], [t, v, v, q, p, p], [p, p, t, v, v, q]].map(c => c[i]!)
  return `#${rgb.map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("")}`
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return [h, max ? d / max : 0, max]
}

export function SiteHeader({
  dashboardName = "My Dashboard",
  sheetUrl,
  paletteId,
  onPaletteChange,
  customColor,
  onCustomColorChange,
}: {
  dashboardName?: string
  sheetUrl?: string
  paletteId?: string
  onPaletteChange?: (id: string) => void
  customColor?: string
  onCustomColorChange?: (color: string) => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(dashboardName)
  const inputRef = useRef<HTMLInputElement>(null)

  const initColor = customColor ?? "#6366f1"
  const initHsv = hexToHsv(initColor)
  const [hue, setHue] = useState(initHsv[0])
  const [sat, setSat] = useState(initHsv[1])
  const [val, setVal] = useState(initHsv[2])
  const [liveColor, setLiveColor] = useState(initColor)
  const [hexInput, setHexInput] = useState(initColor)
  const [pickerOpen, setPickerOpen] = useState(false)

  const hueRef = useRef(initHsv[0])
  const satRef = useRef(initHsv[1])
  const valRef = useRef(initHsv[2])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const gradientRef = useRef<HTMLDivElement>(null)
  const hueBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setNameValue(dashboardName) }, [dashboardName])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  useEffect(() => {
    if (!customColor) return
    const [h, s, v] = hexToHsv(customColor)
    setHue(h); setSat(s); setVal(v)
    hueRef.current = h; satRef.current = s; valRef.current = v
    setLiveColor(customColor); setHexInput(customColor)
  }, [customColor])

  useEffect(() => {
    if (!pickerOpen) return
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [pickerOpen])

  function save() {
    setEditing(false)
    const trimmed = nameValue.trim() || "My Dashboard"
    setNameValue(trimmed)
    const params = new URLSearchParams()
    if (sheetUrl) params.set("url", sheetUrl)
    if (trimmed !== "My Dashboard") params.set("name", trimmed)
    router.replace(`/dashboard${params.size ? `?${params}` : ""}`)
  }

  function onNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save()
    if (e.key === "Escape") { setNameValue(dashboardName); setEditing(false) }
  }

  function emit(hex: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onCustomColorChange?.(hex), 200)
  }

  function applyHsv(h: number, s: number, v: number) {
    setHue(h); setSat(s); setVal(v)
    hueRef.current = h; satRef.current = s; valRef.current = v
    const hex = hsvToHex(h, s, v)
    setLiveColor(hex); setHexInput(hex)
    emit(hex)
  }

  function applyHex(hex: string) {
    setLiveColor(hex); setHexInput(hex)
    const [h, s, v] = hexToHsv(hex)
    setHue(h); setSat(s); setVal(v)
    hueRef.current = h; satRef.current = s; valRef.current = v
    emit(hex)
  }

  function startGradientDrag(e: React.MouseEvent) {
    e.preventDefault()
    const currentHue = hueRef.current
    function update(ev: MouseEvent) {
      if (!gradientRef.current) return
      const r = gradientRef.current.getBoundingClientRect()
      const s = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width))
      const v = Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height))
      applyHsv(currentHue, s, v)
    }
    update(e.nativeEvent)
    function onUp() { document.removeEventListener("mousemove", update); document.removeEventListener("mouseup", onUp) }
    document.addEventListener("mousemove", update)
    document.addEventListener("mouseup", onUp)
  }

  function startHueDrag(e: React.MouseEvent) {
    e.preventDefault()
    function update(ev: MouseEvent) {
      if (!hueBarRef.current) return
      const r = hueBarRef.current.getBoundingClientRect()
      const h = Math.max(0, Math.min(360, (ev.clientX - r.left) / r.width * 360))
      applyHsv(h, satRef.current, valRef.current)
    }
    update(e.nativeEvent)
    function onUp() { document.removeEventListener("mousemove", update); document.removeEventListener("mouseup", onUp) }
    document.addEventListener("mousemove", update)
    document.addEventListener("mouseup", onUp)
  }

  function onHexChange(raw: string) {
    setHexInput(raw)
    const normalized = raw.startsWith("#") ? raw : `#${raw}`
    if (/^#[0-9a-f]{6}$/i.test(normalized)) applyHex(normalized)
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />

        <div className="flex items-center gap-1.5 flex-1 min-w-0 group/title">
          <input
            ref={inputRef}
            value={nameValue}
            readOnly={!editing}
            onChange={e => setNameValue(e.target.value)}
            onBlur={editing ? save : undefined}
            onKeyDown={editing ? onNameKeyDown : undefined}
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
              const isSelected = paletteId === p.id
              return (
                <button
                  key={p.id}
                  title={p.label}
                  onClick={() => onPaletteChange(p.id)}
                  className="size-4 rounded-full transition-all shrink-0"
                  style={{
                    background: p.primary.light,
                    outline: isSelected ? `2px solid ${p.primary.light}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              )
            })}

            {onCustomColorChange && (
              <div className="relative shrink-0" ref={pickerRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Custom color"
                  onClick={() => setPickerOpen(o => !o)}
                  style={paletteId === "custom" ? { color: liveColor } : undefined}
                >
                  <Palette className="size-4" />
                </Button>

                {pickerOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-border bg-background shadow-lg p-3 flex flex-col gap-2.5">

                    {/* Saturation / brightness square */}
                    <div className="relative w-full select-none" style={{ height: 128 }}>
                      <div
                        ref={gradientRef}
                        className="absolute inset-0 rounded-lg overflow-hidden cursor-crosshair"
                        style={{ background: `hsl(${hue}, 100%, 50%)` }}
                        onMouseDown={startGradientDrag}
                      >
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, white, transparent)" }} />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent, black)" }} />
                      </div>
                      {/* cursor sits outside overflow-hidden so it's never clipped */}
                      <div
                        className="pointer-events-none absolute size-3.5 rounded-full border-2 border-white shadow"
                        style={{
                          left: `${sat * 100}%`,
                          top: `${(1 - val) * 100}%`,
                          transform: "translate(-50%, -50%)",
                          background: liveColor,
                          zIndex: 1,
                        }}
                      />
                    </div>

                    {/* Hue slider */}
                    <div
                      ref={hueBarRef}
                      className="relative h-3 rounded-full cursor-pointer select-none"
                      style={{ background: HUE_GRADIENT }}
                      onMouseDown={startHueDrag}
                    >
                      <div
                        className="pointer-events-none absolute size-4 rounded-full border-2 border-white shadow"
                        style={{
                          left: `${(hue / 360) * 100}%`,
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          background: `hsl(${hue}, 100%, 50%)`,
                        }}
                      />
                    </div>

                    <Separator />

                    {/* Quick-pick swatches */}
                    <div className="grid grid-cols-6 gap-1.5">
                      {QUICK_COLORS.map(c => (
                        <button
                          key={c}
                          title={c}
                          onClick={() => { applyHex(c); setPickerOpen(false) }}
                          className="size-5 rounded-full transition-all hover:scale-110 shrink-0"
                          style={{
                            background: c,
                            outline: liveColor === c ? `2px solid ${c}` : "none",
                            outlineOffset: "2px",
                          }}
                        />
                      ))}
                    </div>

                    <Separator />

                    {/* Hex input */}
                    <div className="flex items-center gap-2">
                      <div
                        className="size-5 rounded-md shrink-0 border border-border"
                        style={{ background: liveColor }}
                      />
                      <input
                        value={hexInput}
                        onChange={e => onHexChange(e.target.value)}
                        onBlur={() => {
                          const n = hexInput.startsWith("#") ? hexInput : `#${hexInput}`
                          if (!/^#[0-9a-f]{6}$/i.test(n)) setHexInput(liveColor)
                        }}
                        className="flex-1 min-w-0 bg-muted rounded-md px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
                        placeholder="#6366f1"
                        maxLength={7}
                        spellCheck={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

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
