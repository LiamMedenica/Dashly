"use client"

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, createContext, useContext } from "react"
import { createPortal } from "react-dom"
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Label as PieLabel, LabelList, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig as ShadChartConfig,
} from "@workspace/ui/components/chart"
import { COLOR_PALETTES, buildCustomPalette, type ColorPalette } from "@/lib/palettes"

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Calendar } from "@workspace/ui/components/calendar"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { TrendingUpIcon, TrendingDownIcon, CalendarIcon, BarChart2Icon, BarChartHorizontalIcon, PencilIcon, CopyIcon, Trash2Icon, SaveIcon, Share2Icon, ZoomInIcon, ZoomOutIcon, ScanIcon, ImageIcon, BoldIcon, ItalicIcon, UnderlineIcon as UnderlineIconLucide, ListIcon, ListOrderedIcon, Heading1Icon, Heading2Icon, TypeIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, XIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { type ColumnInfo } from "@/lib/analyze"
import { toast } from "sonner"
import { useEditor, EditorContent, useEditorState } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TiptapUnderline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Placeholder from "@tiptap/extension-placeholder"

// ─── constants ────────────────────────────────────────────────────────────────

const SNAP      = 24
const LOGICAL_W = SNAP * 67  // 1608 — fixed logical canvas width
const MIN_W = SNAP * 4
const MIN_H = SNAP * 3
const GHOST_W       = 11 * SNAP
const GHOST_H       =  7 * SNAP
const CHART_GHOST_W = 20 * SNAP
const CHART_GHOST_H = 14 * SNAP
const TEXT_GHOST_W  = 20 * SNAP
const TEXT_GHOST_H  =  5 * SNAP
const MIN_SCALE = 0.1
const MAX_SCALE = 3

const PaletteContext = createContext<ColorPalette>(COLOR_PALETTES[0]!)

// ─── helpers ─────────────────────────────────────────────────────────────────

function snapTo(v: number) { return Math.round(v / SNAP) * SNAP }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(v, hi)) }
function rubberBand(v: number, lo: number, hi: number) {
  if (v < lo) return lo - (lo - v) * 0.25
  if (v > hi) return hi + (v - hi) * 0.25
  return v
}

function parseNum(v: string): number {
  return parseFloat(v.replace(/[$€£¥₹,%\s]/g, "").replace(/,/g, ""))
}

function fmtValue(n: number): string {
  if (!isFinite(n)) return "—"
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

type Agg = "sum" | "avg" | "count" | "max" | "min"

function computeAgg(col: ColumnInfo, agg: Agg, rows: string[][]): number {
  const vals = rows
    .map(r => parseNum(r[col.index] ?? ""))
    .filter(n => isFinite(n))
  if (!vals.length) return 0
  if (agg === "sum")   return vals.reduce((a, b) => a + b, 0)
  if (agg === "avg")   return vals.reduce((a, b) => a + b, 0) / vals.length
  if (agg === "count") return vals.length
  if (agg === "max")   return Math.max(...vals)
  if (agg === "min")   return Math.min(...vals)
  return 0
}

const AGG_LABELS: Record<Agg, string> = {
  sum: "Total", avg: "Average", count: "Count", max: "Maximum", min: "Minimum",
}

type FilterPeriod = "all" | "this_week" | "last_week" | "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "last_year" | "last_7d" | "last_30d" | "last_90d" | "custom"

const TREND_LABELS: Partial<Record<FilterPeriod, string>> = {
  this_week: "vs last week", last_week: "vs week before",
  this_month: "vs last month", last_month: "vs month before",
  this_quarter: "vs last quarter", last_quarter: "vs quarter before",
  this_year: "vs last year", last_year: "vs year before",
  last_7d: "vs prior 7 days", last_30d: "vs prior 30 days", last_90d: "vs prior 90 days",
  custom: "vs prior period",
}

function dataMaxDate(rows: string[][], dateCol: ColumnInfo): Date | null {
  const ts = rows.map(r => new Date(r[dateCol.index] ?? "").getTime()).filter(t => !isNaN(t))
  return ts.length ? new Date(Math.max(...ts)) : null
}

// All date arithmetic is relative to `ref` (the latest date in the data), not today.
function getDateRange(filter: FilterPeriod, ref: Date, from?: string, to?: string): { start: Date; end: Date } | null {
  if (filter === "all") return null
  if (filter === "custom") {
    if (!from || !to) return null
    return { start: new Date(from), end: new Date(to + "T23:59:59") }
  }
  const d = ref
  if (filter === "this_week") {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
    return { start, end: d }
  }
  if (filter === "last_week") {
    const thisWeekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
    const start = new Date(thisWeekStart.getTime() - 7 * 86_400_000)
    return { start, end: new Date(thisWeekStart.getTime() - 1) }
  }
  if (filter === "this_month")   return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: d }
  if (filter === "last_month")   return { start: new Date(d.getFullYear(), d.getMonth() - 1, 1), end: new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59) }
  if (filter === "this_quarter") {
    const q = Math.floor(d.getMonth() / 3)
    return { start: new Date(d.getFullYear(), q * 3, 1), end: d }
  }
  if (filter === "last_quarter") {
    const q = Math.floor(d.getMonth() / 3)
    const pq = q === 0 ? 3 : q - 1
    const py = q === 0 ? d.getFullYear() - 1 : d.getFullYear()
    return { start: new Date(py, pq * 3, 1), end: new Date(py, pq * 3 + 3, 0, 23, 59, 59) }
  }
  if (filter === "this_year")    return { start: new Date(d.getFullYear(), 0, 1), end: d }
  if (filter === "last_year")    return { start: new Date(d.getFullYear() - 1, 0, 1), end: new Date(d.getFullYear() - 1, 11, 31, 23, 59, 59) }
  if (filter === "last_7d")      return { start: new Date(d.getTime() - 7  * 86_400_000), end: d }
  if (filter === "last_30d")     return { start: new Date(d.getTime() - 30 * 86_400_000), end: d }
  if (filter === "last_90d")     return { start: new Date(d.getTime() - 90 * 86_400_000), end: d }
  return null
}

function computeFilterLabel(filter: FilterPeriod, ref: Date, from?: string, to?: string): string | null {
  if (filter === "all") return null
  if (filter === "custom") {
    if (!from || !to) return null
    const f = new Date(from), t = new Date(to)
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    return `${fmt(f)} – ${fmt(t)}, ${t.getFullYear()}`
  }
  const range = getDateRange(filter, ref, from, to)
  if (!range) return null
  const { start } = range
  if (filter === "this_month" || filter === "last_month")
    return start.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  if (filter === "this_year" || filter === "last_year")
    return String(start.getFullYear())
  if (filter === "this_week" || filter === "last_week")
    return `Week of ${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
  if (filter === "this_quarter" || filter === "last_quarter") {
    const q = Math.floor(start.getMonth() / 3) + 1
    return `Q${q} ${start.getFullYear()}`
  }
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  return `${fmt(range.start)} – ${fmt(range.end)}`
}

function filterRows(rows: string[][], dateCol: ColumnInfo, filter: FilterPeriod, from?: string, to?: string): string[][] {
  if (filter === "all") return rows
  const ref = dataMaxDate(rows, dateCol)
  if (!ref) return rows
  const range = getDateRange(filter, ref, from, to)
  if (!range) return rows
  return rows.filter(r => {
    const t = new Date(r[dateCol.index] ?? "").getTime()
    return !isNaN(t) && t >= range.start.getTime() && t <= range.end.getTime()
  })
}

function deriveTrend(
  col: ColumnInfo, agg: Agg, dateCol: ColumnInfo, rows: string[][], filter: FilterPeriod, from?: string, to?: string
): { pct: string; up: boolean; label: string } | null {
  if (filter === "all") return null
  const ref = dataMaxDate(rows, dateCol)
  if (!ref) return null
  const range = getDateRange(filter, ref, from, to)
  if (!range) return null

  const { start, end } = range
  const spanMs = end.getTime() - start.getTime()
  let prevStart: Date

  if (filter === "this_month" || filter === "last_month")
    prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1)
  else if (filter === "this_quarter")
    prevStart = new Date(start.getFullYear(), start.getMonth() - 3, 1)
  else if (filter === "this_year" || filter === "last_year")
    prevStart = new Date(start.getFullYear() - 1, 0, 1)
  else
    prevStart = new Date(start.getTime() - spanMs)

  const prevEnd = new Date(start.getTime() - 1)
  const dated   = rows.map(r => ({ row: r, t: new Date(r[dateCol.index] ?? "").getTime() })).filter(x => !isNaN(x.t))
  const currRows = dated.filter(x => x.t >= start.getTime() && x.t <= end.getTime()).map(x => x.row)
  const prevRows = dated.filter(x => x.t >= prevStart.getTime() && x.t <= prevEnd.getTime()).map(x => x.row)

  if (!currRows.length || !prevRows.length) return null
  const currVal = computeAgg(col, agg, currRows)
  const prevVal = computeAgg(col, agg, prevRows)
  if (prevVal === 0) return null

  const pct = ((currVal - prevVal) / Math.abs(prevVal)) * 100
  return { pct: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, up: pct >= 0, label: TREND_LABELS[filter] ?? "vs prev period" }
}

function aggregateByX(rows: string[][], xCol: ColumnInfo, yCol: ColumnInfo, agg: Agg): { x: string; y: number }[] {
  const groups = new Map<string, number[]>()
  for (const row of rows) {
    const x = row[xCol.index] ?? ""
    if (!x) continue
    const y = parseNum(row[yCol.index] ?? "")
    if (!isFinite(y)) continue
    if (!groups.has(x)) groups.set(x, [])
    groups.get(x)!.push(y)
  }
  const result = Array.from(groups.entries()).map(([x, vals]) => ({
    x,
    y: agg === "sum"   ? vals.reduce((a, b) => a + b, 0)
      : agg === "avg"  ? vals.reduce((a, b) => a + b, 0) / vals.length
      : agg === "count" ? vals.length
      : agg === "max"  ? Math.max(...vals)
      : Math.min(...vals),
  }))
  if (xCol.type === "date") {
    result.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime())
  } else {
    result.sort((a, b) => a.x.localeCompare(b.x))
  }
  return result
}

function aggregateByXMulti(
  rows: string[][], xCol: ColumnInfo, y1Col: ColumnInfo, y2Col: ColumnInfo, agg: Agg
): { x: string; y: number; y2: number }[] {
  const s1 = aggregateByX(rows, xCol, y1Col, agg)
  const s2 = aggregateByX(rows, xCol, y2Col, agg)
  const map2 = new Map(s2.map(p => [p.x, p.y]))
  return s1.map(p => ({ x: p.x, y: p.y, y2: map2.get(p.x) ?? 0 }))
}

// ─── types ───────────────────────────────────────────────────────────────────

export type ChartType = "bar" | "line" | "area" | "pie"
type ChartConfig = {
  type: ChartType
  xCol: string
  yCol: string
  yCol2?: string
  agg: Agg
  title: string
  filter?: FilterPeriod
  filterFrom?: string
  filterTo?: string
  filterLabel?: string
  orientation?: "vertical" | "horizontal"
  smooth?: boolean
  showLabels?: boolean
  stacked?: boolean
  showLegend?: boolean
  showCenter?: boolean
}
export type StatConfig = {
  column: string; agg: Agg; label: string; value: string
  filter?: FilterPeriod; filterFrom?: string; filterTo?: string; filterLabel?: string
  trend?: string; trendUp?: boolean; trendLabel?: string
}
export type TableConfig = {
  title: string
  cols: string[]
  filter?: FilterPeriod
  filterFrom?: string
  filterTo?: string
  filterLabel?: string
}
export type TextConfig = {
  content: string
}
export type LayoutItem = {
  id: string; x: number; y: number; w: number; h: number
  type: "stat" | "chart" | "table" | "text"
  stat?: StatConfig
  chart?: ChartConfig
  table?: TableConfig
  text?: TextConfig
}

// ─── layout ──────────────────────────────────────────────────────────────────

function rectOverlaps(ax: number, ay: number, aw: number, ah: number,
                      bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function resolveCollision(
  id: string, tx: number, ty: number, w: number, h: number,
  layout: LayoutItem[], canvasW: number,
  allowFallback = true,
): { x: number; y: number } | null {
  const others = layout.filter(it => it.id !== id)

  function free(x: number, y: number) {
    if (x < SNAP || x + w > canvasW - SNAP || y < SNAP) return false
    return !others.some(o => rectOverlaps(x, y, w, h, o.x - SNAP, o.y - SNAP, o.w + SNAP * 2, o.h + SNAP * 2))
  }

  if (free(tx, ty)) return { x: tx, y: ty }

  const c = others.find(o => rectOverlaps(tx, ty, w, h, o.x - SNAP, o.y - SNAP, o.w + SNAP * 2, o.h + SNAP * 2))
  if (!c) return allowFallback ? { x: tx, y: ty } : null

  const baseCandidates = [
    { x: snapTo(c.x + c.w + SNAP), y: ty },
    { x: snapTo(c.x - w - SNAP),   y: ty },
    { x: tx, y: snapTo(c.y + c.h + SNAP) },
    { x: tx, y: snapTo(c.y - h - SNAP)   },
  ]

  const fallbackY = snapTo(layout.reduce((m, it) => Math.max(m, it.y + it.h), 0) + SNAP)
  const allCandidates = allowFallback
    ? [...baseCandidates, { x: SNAP, y: fallbackY }, { x: tx, y: fallbackY }]
    : baseCandidates

  const candidates = allCandidates.filter(p => free(p.x, p.y))
  if (!candidates.length) return allowFallback ? { x: tx, y: ty } : null

  return candidates.reduce((best, p) =>
    Math.abs(p.x - tx) + Math.abs(p.y - ty) < Math.abs(best.x - tx) + Math.abs(best.y - ty) ? p : best
  )
}

function buildLayout(_cw: number): LayoutItem[] {
  return []
}

// ── cascade collision resolver ─────────────────────────────────────────────────

// Commit-time overlap check — enforces 1-SNAP gap between all tiles.
function tilesOverlap(a: LayoutItem, b: LayoutItem): boolean {
  return rectOverlaps(
    a.x - SNAP, a.y - SNAP, a.w + SNAP * 2, a.h + SNAP * 2,
    b.x, b.y, b.w, b.h
  )
}

// Preview overlap check — cascade triggers only when overlap exceeds 40% of the smaller
// tile's dimension on both axes. A KPI barely clipping a chart corner won't move it,
// but dragging either tile 40%+ into the other will.
function tileShouldYield(item: LayoutItem, blocker: LayoutItem): boolean {
  const ox = Math.min(item.x + item.w, blocker.x + blocker.w) - Math.max(item.x, blocker.x)
  const oy = Math.min(item.y + item.h, blocker.y + blocker.h) - Math.max(item.y, blocker.y)
  if (ox <= 0 || oy <= 0) return false
  return ox > Math.min(item.w, blocker.w) * 0.4 && oy > Math.min(item.h, blocker.h) * 0.4
}

// On success returns the fully-resolved layout.
// Returns null if the drop must be rejected (a tile is cornered with no clean escape),
// so the dragged tile bounces back rather than anything teleporting.
function computeCascade(
  layout: LayoutItem[],
  dragId: string,
  dragX: number,
  dragY: number,
  canvasW: number,
  preview = false,
): LayoutItem[] | null {
  const working = layout.map(it =>
    it.id === dragId ? { ...it, x: dragX, y: dragY } : { ...it }
  )
  const overlaps = preview ? tileShouldYield : tilesOverlap

  // Moves `item` to snapped (tx, ty), chain-pushing any tiles in the way in the same
  // direction.  `chain` is a cycle-guard — no tile gets pushed twice in one chain.
  // Returns false and rolls back all movements if the chain is impossible.
  function push(item: LayoutItem, tx: number, ty: number, chain: Set<string>): boolean {
    const sx = snapTo(tx), sy = snapTo(ty)
    if (sx < SNAP || sx + item.w > canvasW - SNAP || sy < SNAP) return false
    if (chain.has(item.id)) return false
    const nextChain = new Set(chain)
    nextChain.add(item.id)

    const inWay = working.filter(o =>
      o.id !== item.id &&
      rectOverlaps(sx - SNAP, sy - SNAP, item.w + SNAP * 2, item.h + SNAP * 2, o.x, o.y, o.w, o.h)
    )
    if (inWay.length === 0) { item.x = sx; item.y = sy; return true }

    // Push direction follows this item's movement so the whole chain flows the same way.
    const dx = sx - item.x, dy = sy - item.y
    const horizontal = Math.abs(dx) >= Math.abs(dy)
    const saved = working.map(b => ({ b, x: b.x, y: b.y }))

    const allMoved = inWay.every(b => {
      // Place b just beyond where item will land, in the same direction.
      const nx = horizontal ? sx + (dx > 0 ? item.w + SNAP : -(b.w + SNAP)) : b.x
      const ny = !horizontal ? sy + (dy > 0 ? item.h + SNAP : -(b.h + SNAP)) : b.y
      return push(b, nx, ny, nextChain)
    })

    if (allMoved) { item.x = sx; item.y = sy; return true }
    for (const s of saved) { s.b.x = s.x; s.b.y = s.y }  // rollback
    return false
  }

  const maxPasses = preview ? 4 : 20
  for (let pass = 0; pass < maxPasses; pass++) {
    let anyMoved = false
    for (const item of working) {
      if (item.id === dragId) continue
      const blocker = working.find(o => o.id !== item.id && overlaps(item, o))
      if (!blocker) continue

      const ox = Math.min(item.x + item.w, blocker.x + blocker.w) - Math.max(item.x, blocker.x)
      const oy = Math.min(item.y + item.h, blocker.y + blocker.h) - Math.max(item.y, blocker.y)
      // Blocker center ≤ item center → blocker is to the left → item escapes right (and vice versa)
      const goRight = blocker.x + blocker.w / 2 <= item.x + item.w / 2

      const rightX = blocker.x + blocker.w + SNAP
      const leftX  = blocker.x - item.w  - SNAP
      const downY  = blocker.y + blocker.h + SNAP
      const upY    = blocker.y - item.h  - SNAP

      // Same-row tiles try BOTH horizontal directions before falling down.
      // Cross-row tiles: if the item is BELOW the blocker, try UP first — the blocker
      // moved down from above, leaving free space above it (swap/bubble-up behaviour).
      // If the item is above the blocker, go down first (natural push-down).
      const sameRow  = Math.abs(item.y - blocker.y) < SNAP
      const preferUp = !sameRow && item.y >= blocker.y   // item below blocker → go up into vacated space

      const primaryV   = { x: item.x, y: preferUp ? upY   : downY }
      const secondaryV = { x: item.x, y: preferUp ? downY : upY   }

      const candidates = sameRow
        ? [
            { x: goRight ? rightX : leftX, y: item.y },   // horizontal — preferred
            { x: goRight ? leftX : rightX, y: item.y },   // horizontal — other side
            primaryV,                                        // vertical (last resort)
            secondaryV,
          ]
        : ox <= oy
          ? [
              { x: goRight ? rightX : leftX, y: item.y },   // horizontal — primary axis
              primaryV,
              { x: goRight ? leftX : rightX, y: item.y },
              secondaryV,
            ]
          : [
              primaryV,                                        // vertical — primary axis
              { x: goRight ? rightX : leftX, y: item.y },
              secondaryV,
              { x: goRight ? leftX : rightX, y: item.y },
            ]

      for (const c of candidates) {
        if (push(item, c.x, c.y, new Set([dragId]))) { anyMoved = true; break }
      }
    }
    if (!anyMoved) break
  }

  // Commit: reject if any tile remains stuck (no teleportation ever)
  if (!preview) {
    for (const item of working) {
      if (item.id === dragId) continue
      if (working.some(o => o.id !== item.id && tilesOverlap(item, o))) return null
    }
  }

  return working
}

let cancelActiveDrag: (() => void) | null = null

// ─── ResizeHandles ────────────────────────────────────────────────────────────

const HANDLE = 6

function ResizeHandles({ item, canvasW, viewportRef, onUpdate, onResizeStart, onResizeEnd }: {
  item: LayoutItem
  canvasW: number
  viewportRef: React.MutableRefObject<{ panX: number; panY: number; scale: number }>
  onUpdate: (id: string, patch: Partial<LayoutItem>) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
}) {
  function makeHandler(getMove: (dx: number, dy: number) => Partial<LayoutItem>) {
    return (e: React.MouseEvent) => {
      e.stopPropagation(); e.preventDefault()
      const sx = e.clientX, sy = e.clientY
      onResizeStart?.()
      function onMove(ev: MouseEvent) { onUpdate(item.id, getMove((ev.clientX - sx) / viewportRef.current.scale, (ev.clientY - sy) / viewportRef.current.scale)) }
      function onUp() {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup",   onUp)
        onResizeEnd?.()
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup",   onUp)
    }
  }

  const maxW = canvasW - item.x - SNAP
  const onBottom = makeHandler((_, dy) => ({ h: Math.max(MIN_H, snapTo(item.h + dy)) }))
  const onRight  = makeHandler((dx)     => ({ w: clamp(snapTo(item.w + dx), MIN_W, maxW) }))
  const onTop    = makeHandler((_, dy) => { const ny = Math.max(SNAP, snapTo(item.y + dy)); return { y: ny, h: Math.max(MIN_H, item.y + item.h - ny) } })
  const onLeft   = makeHandler((dx)    => { const nx = Math.max(SNAP, snapTo(item.x + dx)); return { x: nx, w: Math.max(MIN_W, item.x + item.w - nx) } })

  const base = "absolute opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 z-10"
  return (
    <>
      <div aria-hidden className={`${base} bottom-0 left-3 right-3 cursor-ns-resize`} style={{ height: HANDLE }} onMouseDown={onBottom} />
      <div aria-hidden className={`${base} top-0 left-3 right-3 cursor-ns-resize`}    style={{ height: HANDLE }} onMouseDown={onTop} />
      <div aria-hidden className={`${base} right-0 top-3 bottom-3 cursor-ew-resize`}  style={{ width:  HANDLE }} onMouseDown={onRight} />
      <div aria-hidden className={`${base} left-0 top-3 bottom-3 cursor-ew-resize`}   style={{ width:  HANDLE }} onMouseDown={onLeft} />
      <div aria-hidden className={`${base} bottom-0 right-0 cursor-nwse-resize`} style={{ width: HANDLE+4, height: HANDLE+4 }} onMouseDown={makeHandler((dx,dy) => ({ w: clamp(snapTo(item.w+dx),MIN_W,maxW), h: Math.max(MIN_H,snapTo(item.h+dy)) }))} />
      <div aria-hidden className={`${base} bottom-0 left-0  cursor-nesw-resize`} style={{ width: HANDLE+4, height: HANDLE+4 }} onMouseDown={makeHandler((dx,dy) => { const nx=Math.max(SNAP,snapTo(item.x+dx)); return { x:nx, w:Math.max(MIN_W,item.x+item.w-nx), h:Math.max(MIN_H,snapTo(item.h+dy)) } })} />
      <div aria-hidden className={`${base} top-0    right-0 cursor-nesw-resize`} style={{ width: HANDLE+4, height: HANDLE+4 }} onMouseDown={makeHandler((dx,dy) => { const ny=Math.max(SNAP,snapTo(item.y+dy)); return { y:ny, w:clamp(snapTo(item.w+dx),MIN_W,maxW), h:Math.max(MIN_H,item.y+item.h-ny) } })} />
      <div aria-hidden className={`${base} top-0    left-0  cursor-nwse-resize`} style={{ width: HANDLE+4, height: HANDLE+4 }} onMouseDown={makeHandler((dx,dy) => { const nx=Math.max(SNAP,snapTo(item.x+dx)); const ny=Math.max(SNAP,snapTo(item.y+dy)); return { x:nx, y:ny, w:Math.max(MIN_W,item.x+item.w-nx), h:Math.max(MIN_H,item.y+item.h-ny) } })} />
    </>
  )
}

// ─── TextCard + TextEditDialog ────────────────────────────────────────────────

const TEXT_EDITOR_STYLES = `
  .dashly-text-editor .ProseMirror .is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    color: oklch(0.55 0 0 / 0.4);
    float: left; height: 0; pointer-events: none;
  }
  .dashly-text-editor .ProseMirror { outline: none; cursor: text; }
  .dashly-text-editor .ProseMirror h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.35rem; line-height: 1.25; }
  .dashly-text-editor .ProseMirror h2 { font-size: 1.15rem; font-weight: 600; margin-bottom: 0.3rem; line-height: 1.3; }
  .dashly-text-editor .ProseMirror p { margin-bottom: 0.3rem; line-height: 1.6; }
  .dashly-text-editor .ProseMirror p:last-child { margin-bottom: 0; }
  .dashly-text-editor .ProseMirror ul { list-style: disc; padding-left: 1.2rem; margin-bottom: 0.3rem; }
  .dashly-text-editor .ProseMirror ol { list-style: decimal; padding-left: 1.2rem; margin-bottom: 0.3rem; }
  .dashly-text-editor .ProseMirror li { margin-bottom: 0.15rem; }
  .dashly-text-display h1 { font-size: 1.5rem; font-weight: 700; line-height: 1.25; }
  .dashly-text-display h2 { font-size: 1.15rem; font-weight: 600; line-height: 1.3; }
  .dashly-text-display p { line-height: 1.6; }
  .dashly-text-display ul { list-style: disc; padding-left: 1.2rem; }
  .dashly-text-display ol { list-style: decimal; padding-left: 1.2rem; }
`

function TextToolbar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  const s = useEditorState({
    editor,
    selector: ctx => ({
      bold:    ctx.editor?.isActive("bold")                   ?? false,
      italic:  ctx.editor?.isActive("italic")                 ?? false,
      under:   ctx.editor?.isActive("underline")              ?? false,
      normal: !(ctx.editor?.isActive("heading")               ?? false),
      h1:      ctx.editor?.isActive("heading", { level: 1 })  ?? false,
      h2:      ctx.editor?.isActive("heading", { level: 2 })  ?? false,
      bullet:  ctx.editor?.isActive("bulletList")             ?? false,
      ordered: ctx.editor?.isActive("orderedList")            ?? false,
      alignL:  ctx.editor?.isActive({ textAlign: "left" })    ?? false,
      alignC:  ctx.editor?.isActive({ textAlign: "center" })  ?? false,
      alignR:  ctx.editor?.isActive({ textAlign: "right" })   ?? false,
    }),
  })
  if (!editor || !s) return null

  const btn = (active: boolean) =>
    `h-7 w-7 rounded flex items-center justify-center transition-colors ${
      active
        ? "bg-accent text-accent-foreground"
        : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
    }`
  const sep = <div className="w-px h-4 bg-border mx-0.5" />

  return (
    <div
      className="flex items-center gap-0.5 px-2 py-1.5 shrink-0"
      onMouseDown={e => e.preventDefault()}
    >
      <button type="button" className={btn(s.bold)}    title="Bold"          onClick={() => editor.chain().focus().toggleBold().run()}><BoldIcon className="size-3.5" /></button>
      <button type="button" className={btn(s.italic)}  title="Italic"        onClick={() => editor.chain().focus().toggleItalic().run()}><ItalicIcon className="size-3.5" /></button>
      <button type="button" className={btn(s.under)}   title="Underline"     onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIconLucide className="size-3.5" /></button>
      {sep}
      <button type="button" className={btn(s.normal)}  title="Normal text"   onClick={() => editor.chain().focus().setParagraph().run()}><TypeIcon className="size-3.5" /></button>
      <button type="button" className={btn(s.h1)}      title="Heading 1"     onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1Icon className="size-3.5" /></button>
      <button type="button" className={btn(s.h2)}      title="Heading 2"     onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2Icon className="size-3.5" /></button>
      {sep}
      <button type="button" className={btn(s.bullet)}  title="Bullet list"   onClick={() => editor.chain().focus().toggleBulletList().run()}><ListIcon className="size-3.5" /></button>
      <button type="button" className={btn(s.ordered)} title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrderedIcon className="size-3.5" /></button>
      {sep}
      <button type="button" className={btn(s.alignL)}  title="Align left"    onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeftIcon className="size-3.5" /></button>
      <button type="button" className={btn(s.alignC)}  title="Align center"  onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenterIcon className="size-3.5" /></button>
      <button type="button" className={btn(s.alignR)}  title="Align right"   onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRightIcon className="size-3.5" /></button>
    </div>
  )
}

function TextCard({ item, onEdit }: { item: LayoutItem; onEdit: () => void }) {
  if (!item.text) return null
  return (
    <>
      <style>{TEXT_EDITOR_STYLES}</style>
      <Card
        className="h-full bg-card overflow-hidden"
        style={{ padding: 0, gap: 0 }}
        onDoubleClick={e => { e.stopPropagation(); onEdit() }}
      >
        <div
          className="dashly-text-display h-full px-4 py-3 text-sm overflow-hidden"
          dangerouslySetInnerHTML={{ __html: item.text.content || "<p></p>" }}
        />
      </Card>
    </>
  )
}

function TextEditDialog({ item, onSave, onClose }: {
  item: LayoutItem
  onSave: (html: string) => void
  onClose: () => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapUnderline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start typing…" }),
    ],
    content: item.text?.content ?? "<h1></h1>",
    autofocus: "end",
  })

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      {/* Transparent wrapper — toolbar and tile are separate visual elements */}
      <DialogContent
        showCloseButton={false}
        className="max-w-none p-0 gap-0 flex flex-col items-center"
        style={{ background: "transparent", border: "none", boxShadow: "none", width: "auto" }}
      >
        <style>{TEXT_EDITOR_STYLES}</style>

        {/* Compact toolbar — single row, no wrapping, X to close at the far right */}
        <div className="mb-2 rounded-lg border border-border bg-background shadow-lg overflow-hidden flex items-center flex-nowrap">
          <TextToolbar editor={editor} />
          <div className="w-px h-5 bg-border flex-none mx-0.5" />
          <button
            type="button"
            title="Close (Esc)"
            onClick={onClose}
            className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground flex-none mr-1"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>

        {/* Tile at exact canvas size — overflow-hidden matches on-canvas clipping, no scrollbar */}
        <div
          className="rounded-xl border border-border shadow-lg overflow-hidden"
          style={{ width: item.w, maxWidth: "calc(100vw - 32px)" }}
        >
          <div
            className="dashly-text-editor bg-card px-4 py-3 overflow-hidden cursor-text"
            style={{ height: Math.max(item.h, 80) }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Save / Cancel — centred below the tile */}
        <div
          className="mt-2 flex justify-center gap-2"
          style={{ width: item.w, maxWidth: "calc(100vw - 32px)" }}
        >
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => { onSave(editor?.getHTML() ?? "<p></p>"); onClose() }}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ item }: { item: LayoutItem }) {
  if (!item.stat) return null
  const { label, value, agg, column, filter, filterLabel, trend, trendUp, trendLabel } = item.stat
  const TrendIcon = trendUp === false ? TrendingDownIcon : TrendingUpIcon
  return (
    <Card className="@container/card h-full bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{value}</CardTitle>
        {trend && (
          <CardAction>
            <Badge variant="outline">
              <TrendIcon />
              {trend}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex items-center gap-2 font-medium">
          {trend
            ? <>{trendUp ? "Trending up" : "Trending down"} <TrendIcon className="size-4" /> {trendLabel}</>
            : (filterLabel ?? `${AGG_LABELS[agg]} of ${column}`)}
        </div>
        {trend
          ? filterLabel && <div className="text-muted-foreground">{filterLabel}</div>
          : <div className="text-muted-foreground">{AGG_LABELS[agg]} of {column}</div>
        }
      </CardFooter>
    </Card>
  )
}

// ─── ChartCard ────────────────────────────────────────────────────────────────

function ChartCard({ item, columns, rows, onToggleOrientation, isPreview }: {
  item: LayoutItem
  columns: ColumnInfo[]
  rows: string[][]
  onToggleOrientation?: () => void
  isPreview?: boolean
}) {
  if (!item.chart) return null
  const palette = useContext(PaletteContext)
  const { title, xCol, yCol, agg, filter, filterFrom, filterTo, orientation = "vertical" } = item.chart

  const xColInfo = columns.find(c => c.name === xCol)
  const yColInfo = columns.find(c => c.name === yCol)
  const dateCol  = columns.find(c => c.type === "date")
  const ref      = dateCol ? dataMaxDate(rows, dateCol) : null

  const usedRows = dateCol && filter && filter !== "all"
    ? filterRows(rows, dateCol, filter, filterFrom, filterTo)
    : rows

  const data = xColInfo && yColInfo ? aggregateByX(usedRows, xColInfo, yColInfo, agg) : []

  const filterLabel = ref && filter ? computeFilterLabel(filter, ref) : null

  const chartCfg: ShadChartConfig = {
    y: { label: yCol, theme: palette.primary },
  }

  const isHorizontal = orientation === "horizontal"

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-xs dark:bg-card">
      <CardHeader className="shrink-0">
        <CardTitle>{title || `${AGG_LABELS[agg]} ${yCol} by ${xCol}`}</CardTitle>
        <CardDescription>
          {filterLabel ?? `${AGG_LABELS[agg]} of ${yCol}`}
        </CardDescription>
        <CardAction>
          <button
            onClick={e => { e.stopPropagation(); onToggleOrientation?.() }}
            onMouseDown={e => e.stopPropagation()}
            title={isHorizontal ? "Switch to vertical bars" : "Switch to horizontal bars"}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {isHorizontal
              ? <BarChart2Icon className="size-4" />
              : <BarChartHorizontalIcon className="size-4" />}
          </button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-4">
        <ChartContainer config={chartCfg} className="h-full w-full aspect-auto">
          {isHorizontal ? (
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                type="number"
                dataKey="y"
                tickLine={false}
                axisLine={false}
                tickFormatter={n => fmtValue(n as number)}
              />
              <YAxis
                dataKey="x"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={100}
                tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + "…" : v}
              />
              <CartesianGrid horizontal={false} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={(v) => [fmtValue(typeof v === "number" ? v : 0), yCol]} />}
              />
              <Bar dataKey="y" fill="var(--color-y)" radius={[0, 4, 4, 0]} maxBarSize={32} animationBegin={0} />
            </BarChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="x"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={n => fmtValue(n as number)}
                width={48}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={(v) => [fmtValue(typeof v === "number" ? v : 0), yCol]} />}
              />
              <Bar dataKey="y" fill="var(--color-y)" radius={[4, 4, 0, 0]} maxBarSize={48} animationBegin={0} />
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── LineCard ─────────────────────────────────────────────────────────────────

function LineCard({ item, columns, rows, isPreview }: {
  item: LayoutItem
  columns: ColumnInfo[]
  rows: string[][]
  isPreview?: boolean
}) {
  if (!item.chart) return null
  const palette = useContext(PaletteContext)
  const { title, xCol, yCol, yCol2, agg, filter, filterFrom, filterTo, smooth = true, showLabels = false } = item.chart

  const xColInfo  = columns.find(c => c.name === xCol)
  const yColInfo  = columns.find(c => c.name === yCol)
  const yCol2Info = yCol2 ? columns.find(c => c.name === yCol2) : undefined
  const dateCol   = columns.find(c => c.type === "date")
  const ref       = dateCol ? dataMaxDate(rows, dateCol) : null

  const usedRows = dateCol && filter && filter !== "all"
    ? filterRows(rows, dateCol, filter, filterFrom, filterTo)
    : rows

  const data = xColInfo && yColInfo
    ? yCol2Info
      ? aggregateByXMulti(usedRows, xColInfo, yColInfo, yCol2Info, agg)
      : aggregateByX(usedRows, xColInfo, yColInfo, agg)
    : []

  const filterLabel = ref && filter ? computeFilterLabel(filter, ref) : null
  const curveType = smooth !== false ? "monotone" : "linear"

  const chartCfg: ShadChartConfig = {
    y:  { label: yCol,  theme: palette.primary },
    ...(yCol2Info ? { y2: { label: yCol2, theme: palette.secondary } } : {}),
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-xs dark:bg-card">
      <CardHeader className="shrink-0">
        <CardTitle>{title || `${AGG_LABELS[agg]} ${yCol} by ${xCol}`}</CardTitle>
        <CardDescription>
          {filterLabel ?? `${AGG_LABELS[agg]} of ${yCol}${yCol2 ? ` & ${yCol2}` : ""}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-4">
        <ChartContainer config={chartCfg} className="h-full w-full aspect-auto [&_.recharts-surface]:overflow-hidden">
          <LineChart data={data} margin={{ top: showLabels ? 20 : 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="x"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={n => fmtValue(n as number)}
              width={48}
              domain={[(d: number) => Math.min(0, d), "auto"]}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(v) => [fmtValue(typeof v === "number" ? v : 0), ""]} />}
            />
            <Line
              dataKey="y"
              type={curveType}
              stroke="var(--color-y)"
              strokeWidth={2}
              dot={showLabels ? { fill: "var(--color-y)" } : false}
              activeDot={{ r: 4 }}
            >
              {showLabels && (
                <LabelList
                  dataKey="y"
                  position="top"
                  offset={8}
                  className="fill-foreground"
                  fontSize={11}
                  formatter={(v: unknown) => fmtValue(typeof v === "number" ? v : 0)}
                />
              )}
            </Line>
            {yCol2Info && (
              <Line
                dataKey="y2"
                type={curveType}
                stroke="var(--color-y2)"
                strokeWidth={2}
                dot={showLabels ? { fill: "var(--color-y2)" } : false}
                activeDot={{ r: 4 }}
              >
                {showLabels && (
                  <LabelList
                    dataKey="y2"
                    position="bottom"
                    offset={8}
                    className="fill-foreground"
                    fontSize={11}
                    formatter={(v: unknown) => fmtValue(typeof v === "number" ? v : 0)}
                  />
                )}
              </Line>
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── AreaCard ─────────────────────────────────────────────────────────────────

function AreaCard({ item, columns, rows, isPreview }: {
  item: LayoutItem
  columns: ColumnInfo[]
  rows: string[][]
  isPreview?: boolean
}) {
  if (!item.chart) return null
  const palette = useContext(PaletteContext)
  const { title, xCol, yCol, yCol2, agg, filter, filterFrom, filterTo, smooth = true, stacked = false, showLegend = false } = item.chart

  const xColInfo  = columns.find(c => c.name === xCol)
  const yColInfo  = columns.find(c => c.name === yCol)
  const yCol2Info = yCol2 ? columns.find(c => c.name === yCol2) : undefined
  const dateCol   = columns.find(c => c.type === "date")
  const ref       = dateCol ? dataMaxDate(rows, dateCol) : null

  const usedRows = dateCol && filter && filter !== "all"
    ? filterRows(rows, dateCol, filter, filterFrom, filterTo)
    : rows

  const data = xColInfo && yColInfo
    ? yCol2Info
      ? aggregateByXMulti(usedRows, xColInfo, yColInfo, yCol2Info, agg)
      : aggregateByX(usedRows, xColInfo, yColInfo, agg)
    : []

  const filterLabel = ref && filter ? computeFilterLabel(filter, ref) : null
  const curveType = smooth !== false ? "monotone" : "linear"
  const uid = item.id

  const chartCfg: ShadChartConfig = {
    y:  { label: yCol,  theme: palette.primary },
    ...(yCol2Info ? { y2: { label: yCol2, theme: palette.secondary } } : {}),
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-xs dark:bg-card">
      <CardHeader className="shrink-0">
        <CardTitle>{title || `${AGG_LABELS[agg]} ${yCol} by ${xCol}`}</CardTitle>
        <CardDescription>
          {filterLabel ?? `${AGG_LABELS[agg]} of ${yCol}${yCol2 ? ` & ${yCol2}` : ""}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-4">
        <ChartContainer config={chartCfg} className="h-full w-full aspect-auto [&_.recharts-surface]:overflow-hidden">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`gy-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--color-y)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-y)" stopOpacity={0.02} />
              </linearGradient>
              {yCol2Info && (
                <linearGradient id={`gy2-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-y2)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-y2)" stopOpacity={0.02} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="x"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={n => fmtValue(n as number)}
              width={48}
              domain={[0, 'auto']}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(v) => [fmtValue(typeof v === "number" ? v : 0), ""]} indicator={yCol2Info ? "dot" : "line"} />}
            />
            <Area
              dataKey="y"
              type={curveType}
              fill={`url(#gy-${uid})`}
              stroke="var(--color-y)"
              strokeWidth={2}
              fillOpacity={1}
              animationBegin={0}
              {...(yCol2Info && stacked ? { stackId: "a" } : {})}
            />
            {yCol2Info && (
              <Area
                dataKey="y2"
                type={curveType}
                fill={`url(#gy2-${uid})`}
                stroke="var(--color-y2)"
                strokeWidth={2}
                fillOpacity={1}
                animationBegin={0}
                {...(stacked ? { stackId: "a" } : {})}
              />
            )}
            {showLegend && yCol2Info && <ChartLegend content={<ChartLegendContent />} />}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── PieCard ──────────────────────────────────────────────────────────────────

function PieCard({ item, columns, rows, isPreview }: {
  item: LayoutItem
  columns: ColumnInfo[]
  rows: string[][]
  isPreview?: boolean
}) {
  if (!item.chart) return null
  const palette = useContext(PaletteContext)
  const { title, xCol, yCol, agg, showCenter = true, showLegend = true } = item.chart

  const xColInfo = columns.find(c => c.name === xCol)
  const yColInfo = columns.find(c => c.name === yCol)

  const raw = xColInfo && yColInfo ? aggregateByX(rows, xColInfo, yColInfo, agg) : []
  const data = raw.slice(0, 6).map((d, i) => ({
    name: d.x,
    value: d.y,
    fill: palette.slices[i % 5],
  }))

  const total = data.reduce((sum, d) => sum + d.value, 0)
  const chartCfg: ShadChartConfig = { value: { label: yCol } }

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-xs dark:bg-card">
      <CardHeader className="shrink-0">
        <CardTitle>{title || `${AGG_LABELS[agg]} ${yCol} by ${xCol}`}</CardTitle>
        <CardDescription>{`${AGG_LABELS[agg]} of ${yCol}`}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-2">
        <ChartContainer config={chartCfg} className="h-full w-full aspect-auto">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent
                hideLabel
                formatter={(v) => [fmtValue(typeof v === "number" ? v : 0), ""]}
              />}
            />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="35%" strokeWidth={2} animationBegin={0}>
              {showCenter && (
                <PieLabel
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      const { cx, cy } = viewBox as { cx: number; cy: number }
                      const ir = (viewBox as { innerRadius?: number }).innerRadius ?? 40
                      const fs = Math.max(10, Math.min(22, ir * 0.5))
                      const sfs = Math.max(8, fs * 0.55)
                      return (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={cx} y={cy} fontSize={fs} fontWeight="bold" className="fill-foreground">
                            {fmtValue(total)}
                          </tspan>
                          <tspan x={cx} y={cy + fs * 0.9} fontSize={sfs} className="fill-muted-foreground">
                            {yCol}
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              )}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      {showLegend && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center px-4 pb-3 shrink-0">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full shrink-0" style={{ background: palette.slices[i % 5] }} />
              <span className="truncate max-w-[100px]">{d.name}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── TableCard ────────────────────────────────────────────────────────────────

function TableCard({ item, columns, rows }: {
  item: LayoutItem
  columns: ColumnInfo[]
  rows: string[][]
}) {
  if (!item.table) return null
  const { title, cols, filter, filterFrom, filterTo, filterLabel } = item.table

  const dateCol = columns.find(c => c.type === "date")
  const usedRows = dateCol && filter && filter !== "all"
    ? filterRows(rows, dateCol, filter, filterFrom, filterTo)
    : rows
  const displayRows = usedRows.slice(0, 100)

  const colInfos = cols
    .map(name => columns.find(c => c.name === name))
    .filter((c): c is ColumnInfo => !!c)

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-xs dark:bg-card">
      <CardHeader className="shrink-0">
        <CardTitle>{title || "Data Table"}</CardTitle>
        {filterLabel && <CardDescription>{filterLabel}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted">
            <TableRow>
              {colInfos.map(col => (
                <TableHead key={col.name}>{col.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colInfos.length} className="h-16 text-center text-muted-foreground text-sm">
                  No data
                </TableCell>
              </TableRow>
            ) : displayRows.map((row, i) => (
              <TableRow key={i}>
                {colInfos.map(col => (
                  <TableCell key={col.name} className="text-xs">{row[col.index] ?? ""}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {usedRows.length > 100 && (
        <div className="px-4 py-2 shrink-0 border-t text-xs text-muted-foreground">
          Showing 100 of {usedRows.length} rows
        </div>
      )}
    </Card>
  )
}

// ─── GridItem ─────────────────────────────────────────────────────────────────

const GridItem = React.memo(function GridItem({ item, canvasW, viewportRef, isSelected, onSelect, onUpdate, onDragStart, onDragEnd, onDragMove, onEdit, onDuplicate, onDelete, onResizeEnd, projectedX, projectedY, children }: {
  item: LayoutItem
  canvasW: number
  viewportRef: React.MutableRefObject<{ panX: number; panY: number; scale: number }>
  isSelected: boolean
  onSelect: () => void
  onUpdate: (id: string, patch: Partial<LayoutItem>) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragMove: (id: string, x: number, y: number) => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onResizeEnd?: () => void
  projectedX?: number
  projectedY?: number
  children: React.ReactNode
}) {
  const [live,       setLive]       = useState<{ x: number; y: number } | null>(null)
  const [ghost,      setGhost]      = useState<{ x: number; y: number } | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const prevSnapRef = useRef({ x: item.x, y: item.y })

  const isDragging = live !== null
  const dispX = live?.x ?? (projectedX ?? item.x)
  const dispY = live?.y ?? (projectedY ?? item.y)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    cancelActiveDrag?.()

    const minX = SNAP, maxX = canvasW - item.w - SNAP, minY = SNAP
    const sx = e.clientX, sy = e.clientY
    const bx = item.x,    by = item.y
    let moved = false, snapX = bx, snapY = by
    prevSnapRef.current = { x: bx, y: by }

    // Capture the canvas-space offset of the mouse within the tile at drag start
    // so the tile stays anchored under the cursor even if pan/zoom changes mid-drag.
    const { panX: panX0, panY: panY0, scale: scale0 } = viewportRef.current
    const anchorX = (sx - panX0) / scale0 - bx
    const anchorY = (sy - panY0) / scale0 - by

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - sx, dy = ev.clientY - sy
      if (!moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) { moved = true; onDragStart(); onSelect() }
      if (!moved) return
      const { panX, panY, scale } = viewportRef.current
      const rx = (ev.clientX - panX) / scale - anchorX
      const ry = (ev.clientY - panY) / scale - anchorY
      setLive({ x: rubberBand(rx, minX, maxX), y: ry < minY ? minY - (minY - ry) * 0.25 : ry })
      snapX = clamp(snapTo(rx), minX, maxX)
      snapY = Math.max(minY, snapTo(ry))
      setGhost({ x: snapX, y: snapY })
      if (snapX !== prevSnapRef.current.x || snapY !== prevSnapRef.current.y) {
        prevSnapRef.current = { x: snapX, y: snapY }
        onDragMove(item.id, snapX, snapY)
      }
    }

    function detach() {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup",   onUp)
      cancelActiveDrag = null
    }

    function onUp() {
      if (moved) { onUpdate(item.id, { x: snapX, y: snapY }); setLive(null); setGhost(null); onDragEnd() }
      else { onSelect() }
      detach()
    }

    cancelActiveDrag = () => { setLive(null); setGhost(null); if (moved) onDragEnd(); detach() }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup",   onUp)
  }, [item, canvasW, onUpdate, onDragStart, onDragEnd, onDragMove, onSelect])

  return (
    <>
      {isDragging && ghost && (
        <div aria-hidden className="pointer-events-none absolute rounded-xl border border-dashed border-muted-foreground/25 bg-muted/15"
          style={{ left: ghost.x, top: ghost.y, width: item.w, height: item.h }} />
      )}
      <div
        className={`absolute group/item select-none ${isDragging ? "z-50 cursor-grabbing" : "cursor-grab"}`}
        style={{
          left: dispX, top: dispY, width: item.w, height: item.h,
          zIndex: isDragging ? 50 : isSelected ? 10 : undefined,
          transition: (isDragging || isResizing) ? "none" : "left 0.25s cubic-bezier(0.34,1.56,0.64,1), top 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onMouseDown={onMouseDown}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onSelect() }}
      >
        <div
          className="w-full h-full rounded-xl"
          style={{ boxShadow: isSelected ? "0 0 0 2px var(--primary)" : undefined }}
        >{children}</div>
        {!isDragging && (
          <ResizeHandles
            item={item}
            canvasW={canvasW}
            viewportRef={viewportRef}
            onUpdate={onUpdate}
            onResizeStart={() => setIsResizing(true)}
            onResizeEnd={() => { setIsResizing(false); onResizeEnd?.() }}
          />
        )}

        {isSelected && !isDragging && (
          <div
            className="absolute top-2 right-2 z-20 flex items-center rounded-lg border border-border bg-background/90 backdrop-blur-sm shadow-md overflow-hidden"
            onMouseDown={e => e.stopPropagation()}
          >
            <button
              onClick={e => { e.stopPropagation(); onEdit() }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <PencilIcon className="size-3" />
              Edit
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={e => { e.stopPropagation(); onDuplicate() }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <CopyIcon className="size-3" />
              Duplicate
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-destructive hover:bg-accent transition-colors"
            >
              <Trash2Icon className="size-3" />
              Delete
            </button>
          </div>
        )}
      </div>
    </>
  )
}, (prev, next) =>
  prev.item === next.item &&
  prev.isSelected === next.isSelected &&
  prev.projectedX === next.projectedX &&
  prev.projectedY === next.projectedY
)

// ─── DashboardGrid ────────────────────────────────────────────────────────────

export function DashboardGrid({ columns = [], rows = [], paletteId, customColor, sheetUrl, initialLayout, initialLayoutFn, generationError }: {
  columns?: ColumnInfo[]
  rows?: string[][]
  paletteId?: string
  customColor?: string
  sheetUrl?: string
  initialLayout?: LayoutItem[]
  initialLayoutFn?: (canvasW: number) => LayoutItem[]
  generationError?: string
}) {
  const palette = paletteId === "custom" && customColor
    ? buildCustomPalette(customColor)
    : COLOR_PALETTES.find(p => p.id === paletteId) ?? COLOR_PALETTES[0]!
  const canvasRef = useRef<HTMLDivElement>(null)
  const outerRef    = useRef<HTMLDivElement>(null)
  const canvasW     = LOGICAL_W
  const viewportRef = useRef({ panX: 0, panY: 0, scale: 1 })
  const scaleRef    = useRef(1)
  const zoomLabelRef = useRef<HTMLSpanElement>(null)
  const [layout,   setLayout]   = useState<LayoutItem[]>(initialLayout ?? [])
  const [dragging, setDragging] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null)
  const [dragProjection, setDragProjection] = useState<Map<string, { x: number; y: number }> | null>(null)
  const dragRafRef    = useRef<number | null>(null)
  const historyRef    = useRef<LayoutItem[][]>([])
  const copiedTileRef = useRef<LayoutItem | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const isResizingRef = useRef(false)

  const columnsRef = useRef(columns)
  const rowsRef    = useRef(rows)
  const layoutRef  = useRef(layout)
  columnsRef.current  = columns
  rowsRef.current     = rows
  layoutRef.current   = layout
  selectedIdRef.current = selectedId

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-49), layoutRef.current]
  }, [])

  const applyTransform = useCallback(() => {
    const { panX, panY, scale } = viewportRef.current
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translate3d(${panX}px,${panY}px,0) scale(${scale})`
    }
    scaleRef.current = scale
    if (zoomLabelRef.current) {
      zoomLabelRef.current.textContent = `${Math.round(scale * 100)}%`
    }
  }, [])

  // ── viewport controls ────────────────────────────────────────────────────────

  const fitToWindow = useCallback(() => {
    const outer = outerRef.current
    if (!outer) return
    const s = Math.min(outer.clientWidth / LOGICAL_W, 1)
    const panX = Math.max(0, (outer.clientWidth - LOGICAL_W * s) / 2)
    viewportRef.current = { panX, panY: 0, scale: s }
    applyTransform()
  }, [applyTransform])

  const doZoom = useCallback((factor: number) => {
    const outer = outerRef.current
    if (!outer) return
    const { panX, panY, scale } = viewportRef.current
    const newScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE)
    const cx = outer.clientWidth / 2, cy = outer.clientHeight / 2
    viewportRef.current = {
      panX: cx - (cx - panX) * (newScale / scale),
      panY: cy - (cy - panY) * (newScale / scale),
      scale: newScale,
    }
    applyTransform()
  }, [applyTransform])

  const onPanStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setSelectedId(null)
    const outer = outerRef.current
    const sx = e.clientX, sy = e.clientY
    const { panX: startX, panY: startY } = viewportRef.current
    let panning = false

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - sx, dy = ev.clientY - sy
      if (!panning && Math.hypot(dx, dy) > 4) {
        panning = true
        if (outer) outer.style.cursor = 'grabbing'
      }
      if (!panning) return
      viewportRef.current = { ...viewportRef.current, panX: startX + dx, panY: startY + dy }
      applyTransform()
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      if (outer) outer.style.cursor = ''
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [applyTransform])

  // Only start panning when the click lands on the outer viewport itself (the gray
  // gutter), not when it bubbles up from the canvas or zoom controls.
  const onGutterMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onPanStart(e)
  }, [onPanStart])

  const onViewportContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setCanvasMenu({ x: e.clientX, y: e.clientY })
  }, [])

  useIsomorphicLayoutEffect(() => {
    const outer = outerRef.current
    if (!outer) return

    // Initial layout
    if (initialLayoutFn) setLayout(initialLayoutFn(canvasW))
    else if (!initialLayout) setLayout(buildLayout(canvasW))

    // Fit to width on mount, centered horizontally
    const s = Math.min(outer.clientWidth / LOGICAL_W, 1)
    const panX = Math.max(0, (outer.clientWidth - LOGICAL_W * s) / 2)
    viewportRef.current = { panX, panY: 0, scale: s }
    applyTransform()

    // Zoom with scroll wheel — applied directly to DOM, no React state
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const { panX, panY, scale } = viewportRef.current
      const overCanvas = canvasRef.current?.contains(e.target as Node) ?? false

      if (!e.ctrlKey && overCanvas) {
        // Scroll on the canvas → pan
        viewportRef.current = {
          ...viewportRef.current,
          panX: panX - e.deltaX,
          panY: panY - e.deltaY,
        }
      } else {
        // Scroll on the gutter, or pinch-to-zoom anywhere → zoom toward cursor
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
        const newScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE)
        const rect = outer!.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        viewportRef.current = {
          panX: cx - (cx - panX) * (newScale / scale),
          panY: cy - (cy - panY) * (newScale / scale),
          scale: newScale,
        }
      }
      applyTransform()
    }
    outer.addEventListener('wheel', onWheel, { passive: false })
    return () => outer.removeEventListener('wheel', onWheel)
  }, [])

  // ── localStorage: restore or save draft ──
  const DRAFT_KEY = sheetUrl ? `dashly_draft_${sheetUrl}` : null

  useEffect(() => {
    if (!DRAFT_KEY) return
    if (initialLayout?.length) {
      // Fresh AI generation — persist it and strip ?generate from the URL
      localStorage.setItem(DRAFT_KEY, JSON.stringify(initialLayout))
      const u = new URL(window.location.href)
      if (u.searchParams.has("generate")) {
        u.searchParams.delete("generate")
        window.history.replaceState({}, "", u.toString())
      }
      return
    }
    // No server-provided layout — try to restore a saved draft
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as LayoutItem[]
        if (Array.isArray(parsed) && parsed.length > 0) setLayout(parsed)
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!DRAFT_KEY || layout.length === 0) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(layout))
  }, [layout, DRAFT_KEY])

  // ── generation error toast ──
  useEffect(() => {
    if (generationError) toast.error(generationError)
  }, [generationError])

  // ── close canvas context menu on Escape ──
  useEffect(() => {
    if (!canvasMenu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCanvasMenu(null) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [canvasMenu])

  // ── collision-aware move ──
  const onUpdate = useCallback((id: string, patch: Partial<LayoutItem>) => {
    if ('x' in patch && 'y' in patch && !('w' in patch) && !('h' in patch)) {
      // Drag drop — push history once per drop
      pushHistory()
    } else if (('w' in patch || 'h' in patch) && !isResizingRef.current) {
      // First resize event of this gesture — push history once
      isResizingRef.current = true
      pushHistory()
    }
    setLayout(prev => {
      const item = prev.find(it => it.id === id)!
      const next = { ...item, ...patch }
      if ('x' in patch && 'y' in patch && !('w' in patch) && !('h' in patch)) {
        const others = prev.filter(it => it.id !== id)
        // ≥40% penetration on both axes → try to cascade; if any tile is cornered, bounce back
        if (others.some(o => tileShouldYield(next, o))) {
          return computeCascade(prev, id, next.x, next.y, canvasW) ?? prev
        }
        // SNAP-gap violation but <40% penetration → snap adjacent only for a small tile against a single larger blocker
        if (others.some(o => tilesOverlap(next, o))) {
          const overlapping = others.filter(o => tilesOverlap(next, o))
          if (overlapping.length === 1 && next.w * next.h <= overlapping[0]!.w * overlapping[0]!.h) {
            const pos = resolveCollision(id, next.x, next.y, next.w, next.h, prev, canvasW, false)
            if (pos) return prev.map(it => it.id === id ? { ...it, x: pos.x, y: pos.y } : it)
          }
          return prev
        }
        // Completely clear → place freely
        return prev.map(it => it.id === id ? { ...it, x: next.x, y: next.y } : it)
      }
      // Resize: block if it would overlap another tile (enforces 1-SNAP gap during resize)
      const resizeOthers = prev.filter(it => it.id !== id)
      if (resizeOthers.some(o => tilesOverlap(next, o))) return prev
      return prev.map(it => it.id === id ? next : it)
    })
    if ('x' in patch) setDragProjection(null)
  }, [canvasW, pushHistory])

  const stopAutoPanRef = useRef<(() => void) | null>(null)

  const onDragStart = useCallback(() => {
    setDragging(true)
    const outer = outerRef.current
    if (!outer) return

    let mx = 0, my = 0
    let rafId: number | null = null
    const EDGE = 80, SPEED = 14

    function trackMouse(e: MouseEvent) { mx = e.clientX; my = e.clientY }

    function tick() {
      const rect = outer!.getBoundingClientRect()
      let vx = 0, vy = 0
      const ld = mx - rect.left, rd = rect.right - mx
      const td = my - rect.top,  bd = rect.bottom - my
      if (ld < EDGE && ld >= 0) vx =  SPEED * (1 - ld / EDGE)  // near left  → pan right (canvas moves right, reveals left)
      if (rd < EDGE && rd >= 0) vx = -SPEED * (1 - rd / EDGE)  // near right → pan left  (canvas moves left, reveals right)
      if (td < EDGE && td >= 0) vy =  SPEED * (1 - td / EDGE)  // near top   → pan down  (canvas moves down, reveals top)
      if (bd < EDGE && bd >= 0) vy = -SPEED * (1 - bd / EDGE)  // near bot   → pan up    (canvas moves up, reveals bottom)
      if (vx !== 0 || vy !== 0) {
        viewportRef.current.panX += vx
        viewportRef.current.panY += vy
        applyTransform()
        // Re-fire mousemove so the dragged tile re-projects its position against the new panX/panY
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: mx, clientY: my, bubbles: true, cancelable: true }))
      }
      rafId = requestAnimationFrame(tick)
    }

    document.addEventListener('mousemove', trackMouse)
    rafId = requestAnimationFrame(tick)

    stopAutoPanRef.current = () => {
      document.removeEventListener('mousemove', trackMouse)
      if (rafId !== null) cancelAnimationFrame(rafId)
      stopAutoPanRef.current = null
    }
  }, [applyTransform])

  const onDragEnd = useCallback(() => {
    setDragging(false)
    setSelectedId(null)
    setDragProjection(null)
    stopAutoPanRef.current?.()
    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current)
      dragRafRef.current = null
    }
  }, [])

  const onDragMove = useCallback((id: string, snapX: number, snapY: number) => {
    if (dragRafRef.current !== null) cancelAnimationFrame(dragRafRef.current)
    dragRafRef.current = requestAnimationFrame(() => {
      const projected = computeCascade(layoutRef.current, id, snapX, snapY, canvasW, true)
      if (projected) {
        setDragProjection(new Map(
          projected.filter(it => it.id !== id).map(it => [it.id, { x: it.x, y: it.y }])
        ))
      }
      dragRafRef.current = null
    })
  }, [canvasW])

  // ── drop ghost (shared between stat and chart drags) ──
  const [dropGhost, setDropGhost] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // ── text tile inline edit state ──
  const [editingTextId, setEditingTextId] = useState<string | null>(null)

  // ── stat card dialog state ──
  const [pendingPos,      setPendingPos]      = useState<{ x: number; y: number } | null>(null)
  const [editingId,       setEditingId]       = useState<string | null>(null)

  const [configCol,        setConfigCol]        = useState("")
  const [configAgg,        setConfigAgg]        = useState<Agg>("sum")
  const [configTitle,      setConfigTitle]      = useState("")
  const [configFilter,     setConfigFilter]     = useState<FilterPeriod>("all")
  const [configDateRange,  setConfigDateRange]  = useState<DateRange | undefined>(undefined)
  const [showDatePicker,   setShowDatePicker]   = useState(false)
  const [datePickerPos,    setDatePickerPos]    = useState<{ top: number; left: number } | null>(null)
  const dateAnchorRef = useRef<HTMLButtonElement>(null)
  const [configShowTrend,  setConfigShowTrend]  = useState(false)

  // ── chart card dialog state ──
  const [pendingChartPos,  setPendingChartPos]  = useState<{ x: number; y: number } | null>(null)
  const [editingChartId,   setEditingChartId]   = useState<string | null>(null)
  const [chartDialogType,  setChartDialogType]  = useState<ChartType>("bar")
  const [chartConfigXCol,  setChartConfigXCol]  = useState("")
  const [chartConfigYCol,  setChartConfigYCol]  = useState("")
  const [chartConfigAgg,   setChartConfigAgg]   = useState<Agg>("sum")
  const [chartConfigTitle, setChartConfigTitle] = useState("")
  const [chartConfigFilter,     setChartConfigFilter]     = useState<FilterPeriod>("all")
  const [chartConfigSmooth,     setChartConfigSmooth]     = useState(true)
  const [chartConfigShowLabels, setChartConfigShowLabels] = useState(false)
  const [chartConfigYCol2,      setChartConfigYCol2]      = useState("")
  const [chartConfigStacked,    setChartConfigStacked]    = useState(false)
  const [chartConfigShowLegend, setChartConfigShowLegend] = useState(false)
  const [chartConfigShowCenter, setChartConfigShowCenter] = useState(true)
  const [chartConfigOrientation, setChartConfigOrientation] = useState<"horizontal" | "vertical">("vertical")
  // Delayed flag so the preview chart only mounts after the dialog CSS animation finishes
  const [chartPreviewReady, setChartPreviewReady] = useState(false)
  useEffect(() => {
    const open = pendingChartPos !== null || editingChartId !== null
    if (!open) { setChartPreviewReady(false); return }
    const t = setTimeout(() => setChartPreviewReady(true), 120)
    return () => clearTimeout(t)
  }, [pendingChartPos, editingChartId])

  // ── table card dialog state ──
  const [pendingTablePos,  setPendingTablePos]  = useState<{ x: number; y: number } | null>(null)
  const [editingTableId,   setEditingTableId]   = useState<string | null>(null)
  const [tableConfigTitle, setTableConfigTitle] = useState("")
  const [tableConfigCols,  setTableConfigCols]  = useState<string[]>([])
  const [tableConfigFilter, setTableConfigFilter] = useState<FilterPeriod>("all")

  // ── sidebar stat-card drag ──
  useEffect(() => {
    const handler = () => {
      setDragging(true)

      const onMove = (e: MouseEvent) => {
        const outerRect = outerRef.current?.getBoundingClientRect()
        if (!outerRect || e.clientX < outerRect.left || e.clientX > outerRect.right || e.clientY < outerRect.top || e.clientY > outerRect.bottom) {
          setDropGhost(null); return
        }
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) { setDropGhost(null); return }
        const s = scaleRef.current
        setDropGhost({
          x: clamp((e.clientX - rect.left) / s - GHOST_W / 2, SNAP, canvasW - GHOST_W - SNAP),
          y: Math.max(SNAP, (e.clientY - rect.top) / s - GHOST_H / 2),
          w: GHOST_W, h: GHOST_H,
        })
      }

      const onUp = (e: MouseEvent) => {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup",   onUp)
        setDragging(false)
        setDropGhost(null)
        const outerRect = outerRef.current?.getBoundingClientRect()
        if (!outerRect || e.clientX < outerRect.left || e.clientX > outerRect.right || e.clientY < outerRect.top || e.clientY > outerRect.bottom) return
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const s = scaleRef.current
        const tx = clamp(snapTo((e.clientX - rect.left) / s - GHOST_W / 2), SNAP, canvasW - GHOST_W - SNAP)
        const ty = Math.max(SNAP, snapTo((e.clientY - rect.top) / s - GHOST_H / 2))
        const numCols = columnsRef.current.filter(c => c.type === "number")
        setPendingPos({ x: tx, y: ty })
        setConfigCol(numCols[0]?.name ?? "")
        setConfigAgg("sum")
        setConfigTitle("")
        setConfigFilter("all")
        setConfigDateRange(undefined)
        setConfigShowTrend(false)
      }

      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup",   onUp)
    }

    window.addEventListener("sidebar-drag-stat", handler)
    return () => window.removeEventListener("sidebar-drag-stat", handler)
  }, [])

  // ── sidebar chart drag ──
  useEffect(() => {
    const handler = (e: Event) => {
      const chartType = ((e as CustomEvent).detail?.type as ChartType) ?? "bar"
      setDragging(true)

      const onMove = (ev: MouseEvent) => {
        const outerRect = outerRef.current?.getBoundingClientRect()
        if (!outerRect || ev.clientX < outerRect.left || ev.clientX > outerRect.right || ev.clientY < outerRect.top || ev.clientY > outerRect.bottom) {
          setDropGhost(null); return
        }
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) { setDropGhost(null); return }
        const s = scaleRef.current
        setDropGhost({
          x: clamp((ev.clientX - rect.left) / s - CHART_GHOST_W / 2, SNAP, canvasW - CHART_GHOST_W - SNAP),
          y: Math.max(SNAP, (ev.clientY - rect.top) / s - CHART_GHOST_H / 2),
          w: CHART_GHOST_W, h: CHART_GHOST_H,
        })
      }

      const onUp = (ev: MouseEvent) => {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup",   onUp)
        setDragging(false)
        setDropGhost(null)
        const outerRect = outerRef.current?.getBoundingClientRect()
        if (!outerRect || ev.clientX < outerRect.left || ev.clientX > outerRect.right || ev.clientY < outerRect.top || ev.clientY > outerRect.bottom) return
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const s = scaleRef.current
        const tx = clamp(snapTo((ev.clientX - rect.left) / s - CHART_GHOST_W / 2), SNAP, canvasW - CHART_GHOST_W - SNAP)
        const ty = Math.max(SNAP, snapTo((ev.clientY - rect.top) / s - CHART_GHOST_H / 2))
        const cols = columnsRef.current
        const catCol = cols.find(c => c.type === "category" || c.type === "text")
        const numCol = cols.find(c => c.type === "number")
        setChartDialogType(chartType)
        setPendingChartPos({ x: tx, y: ty })
        setChartConfigXCol(catCol?.name ?? cols.find(c => c.type !== "number" && c.type !== "id")?.name ?? "")
        setChartConfigYCol(numCol?.name ?? "")
        setChartConfigAgg("sum")
        setChartConfigTitle("")
        setChartConfigFilter("all")
        setChartConfigSmooth(true)
        setChartConfigShowLabels(false)
        setChartConfigYCol2("")
        setChartConfigStacked(false)
        setChartConfigShowLegend(chartType === "pie")
        setChartConfigShowCenter(true)
        setChartConfigOrientation("vertical")
      }

      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup",   onUp)
    }

    window.addEventListener("sidebar-drag-chart", handler)
    return () => window.removeEventListener("sidebar-drag-chart", handler)
  }, [])

  // ── sidebar table drag ──
  useEffect(() => {
    const handler = () => {
      setDragging(true)

      const onMove = (ev: MouseEvent) => {
        const outerRect = outerRef.current?.getBoundingClientRect()
        if (!outerRect || ev.clientX < outerRect.left || ev.clientX > outerRect.right || ev.clientY < outerRect.top || ev.clientY > outerRect.bottom) {
          setDropGhost(null); return
        }
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) { setDropGhost(null); return }
        const s = scaleRef.current
        setDropGhost({
          x: clamp((ev.clientX - rect.left) / s - CHART_GHOST_W / 2, SNAP, canvasW - CHART_GHOST_W - SNAP),
          y: Math.max(SNAP, (ev.clientY - rect.top) / s - CHART_GHOST_H / 2),
          w: CHART_GHOST_W, h: CHART_GHOST_H,
        })
      }

      const onUp = (ev: MouseEvent) => {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup",   onUp)
        setDragging(false)
        setDropGhost(null)
        const outerRect = outerRef.current?.getBoundingClientRect()
        if (!outerRect || ev.clientX < outerRect.left || ev.clientX > outerRect.right || ev.clientY < outerRect.top || ev.clientY > outerRect.bottom) return
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const s = scaleRef.current
        const tx = clamp(snapTo((ev.clientX - rect.left) / s - CHART_GHOST_W / 2), SNAP, canvasW - CHART_GHOST_W - SNAP)
        const ty = Math.max(SNAP, snapTo((ev.clientY - rect.top) / s - CHART_GHOST_H / 2))
        const allCols = columnsRef.current.map(c => c.name)
        setPendingTablePos({ x: tx, y: ty })
        setTableConfigTitle("")
        setTableConfigCols(allCols)
        setTableConfigFilter("all")
      }

      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup",   onUp)
    }

    window.addEventListener("sidebar-drag-table", handler)
    return () => window.removeEventListener("sidebar-drag-table", handler)
  }, [])

  // ── sidebar text drag — no dialog, placed immediately then auto-focused ──
  useEffect(() => {
    const handler = () => {
      setDragging(true)

      const onMove = (ev: MouseEvent) => {
        const outerRect = outerRef.current?.getBoundingClientRect()
        if (!outerRect || ev.clientX < outerRect.left || ev.clientX > outerRect.right || ev.clientY < outerRect.top || ev.clientY > outerRect.bottom) {
          setDropGhost(null); return
        }
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) { setDropGhost(null); return }
        const s = scaleRef.current
        setDropGhost({
          x: clamp((ev.clientX - rect.left) / s - TEXT_GHOST_W / 2, SNAP, canvasW - TEXT_GHOST_W - SNAP),
          y: Math.max(SNAP, (ev.clientY - rect.top) / s - TEXT_GHOST_H / 2),
          w: TEXT_GHOST_W, h: TEXT_GHOST_H,
        })
      }

      const onUp = (ev: MouseEvent) => {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup",   onUp)
        setDragging(false)
        setDropGhost(null)
        const outerRect = outerRef.current?.getBoundingClientRect()
        if (!outerRect || ev.clientX < outerRect.left || ev.clientX > outerRect.right || ev.clientY < outerRect.top || ev.clientY > outerRect.bottom) return
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const s = scaleRef.current
        const tx = clamp(snapTo((ev.clientX - rect.left) / s - TEXT_GHOST_W / 2), SNAP, canvasW - TEXT_GHOST_W - SNAP)
        const ty = Math.max(SNAP, snapTo((ev.clientY - rect.top) / s - TEXT_GHOST_H / 2))
        const id = `text-${Date.now()}`
        pushHistory()
        setLayout(prev => {
          const cw = canvasW
          const withNew: LayoutItem[] = [...prev, { id, x: tx, y: ty, w: TEXT_GHOST_W, h: TEXT_GHOST_H, type: "text", text: { content: "<h1></h1>" } }]
          const pos = resolveCollision(id, tx, ty, TEXT_GHOST_W, TEXT_GHOST_H, withNew, cw, true) ?? { x: tx, y: ty }
          return [...prev, { id, x: pos.x, y: pos.y, w: TEXT_GHOST_W, h: TEXT_GHOST_H, type: "text", text: { content: "<h1></h1>" } }]
        })
        setEditingTextId(id)
      }

      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup",   onUp)
    }

    window.addEventListener("sidebar-drag-text", handler)
    return () => window.removeEventListener("sidebar-drag-text", handler)
  }, [canvasW, pushHistory])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSelectedId(null); setEditingTextId(null); return }
      // Don't intercept shortcuts while the user is typing in a form field
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable) return
      const ctrl = e.metaKey || e.ctrlKey
      if (ctrl && e.key === "z") {
        e.preventDefault()
        const prev = historyRef.current[historyRef.current.length - 1]
        if (!prev) return
        historyRef.current = historyRef.current.slice(0, -1)
        setLayout(prev)
      }
      if (ctrl && e.key === "c") {
        e.preventDefault()
        const tile = layoutRef.current.find(it => it.id === selectedIdRef.current)
        if (tile) copiedTileRef.current = tile
      }
      if (ctrl && e.key === "v") {
        e.preventDefault()
        const tile = copiedTileRef.current
        if (!tile) return
        pushHistory()
        const newId = `${tile.type}-${Date.now()}`
        setLayout(prev => {
          const ox = tile.x + SNAP * 2, oy = tile.y + SNAP * 2
          const withNew = [...prev, { ...tile, id: newId, x: ox, y: oy }]
          const pos = resolveCollision(newId, ox, oy, tile.w, tile.h, withNew, canvasW, true) ?? { x: ox, y: oy }
          return [...prev, { ...tile, id: newId, x: pos.x, y: pos.y }]
        })
        setSelectedId(newId)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [canvasW, pushHistory])

  const handleDelete = useCallback((id: string) => {
    pushHistory()
    setLayout(prev => prev.filter(it => it.id !== id))
  }, [pushHistory])

  const handleDuplicate = useCallback((id: string) => {
    pushHistory()
    setLayout(prev => {
      const item = prev.find(it => it.id === id)
      if (!item) return prev
      const newId = `${item.type}-${Date.now()}`
      const cw = canvasW
      const withNew = [...prev, { ...item, id: newId }]
      const pos = resolveCollision(newId, item.x, item.y, item.w, item.h, withNew, cw, true)
        ?? { x: item.x, y: item.y + item.h + SNAP }
      return [...prev, { ...item, id: newId, x: pos.x, y: pos.y }]
    })
  }, [pushHistory])

  const handleEdit = useCallback((id: string) => {
    const item = layoutRef.current.find(it => it.id === id)
    if (!item) return
    if (item.stat) {
      const { column, agg, label, filter, filterFrom, filterTo, trend } = item.stat
      setConfigCol(column)
      setConfigAgg(agg)
      setConfigTitle(label)
      setConfigFilter(filter ?? "all")
      setConfigDateRange(filterFrom && filterTo ? { from: new Date(filterFrom), to: new Date(filterTo) } : undefined)
      setConfigShowTrend(!!trend)
      setEditingId(id)
    } else if (item.chart) {
      const { xCol, yCol, yCol2, agg, title, filter, type, smooth, showLabels, stacked, showLegend, showCenter, orientation } = item.chart
      setChartDialogType(type)
      setChartConfigXCol(xCol)
      setChartConfigYCol(yCol)
      setChartConfigYCol2(yCol2 ?? "")
      setChartConfigAgg(agg)
      setChartConfigTitle(title)
      setChartConfigFilter(filter ?? "all")
      setChartConfigSmooth(smooth !== false)
      setChartConfigShowLabels(showLabels ?? false)
      setChartConfigStacked(stacked ?? false)
      setChartConfigShowLegend(showLegend ?? (type === "pie"))
      setChartConfigShowCenter(showCenter !== false)
      setChartConfigOrientation(orientation ?? "vertical")
      setEditingChartId(id)
    } else if (item.table) {
      const { cols, title, filter } = item.table
      setTableConfigTitle(title)
      setTableConfigCols(cols)
      setTableConfigFilter(filter ?? "all")
      setEditingTableId(id)
    } else if (item.type === "text") {
      setEditingTextId(id)
    }
  }, [])

  const handleConfirm = useCallback(() => {
    if ((!pendingPos && !editingId) || !configCol) return
    pushHistory()
    const col    = columnsRef.current.find(c => c.name === configCol)
    const dCol   = columnsRef.current.find(c => c.type === "date")
    if (!col) return
    const toIso  = (d: Date) => d.toISOString().split("T")[0]
    const cfFrom = configDateRange?.from ? toIso(configDateRange.from) : undefined
    const cfTo   = configDateRange?.to   ? toIso(configDateRange.to)   : undefined
    const autoLabel = `${AGG_LABELS[configAgg]} ${configCol}`
    const label = configTitle.trim() || autoLabel
    const usedRows = dCol && configFilter !== "all"
      ? filterRows(rowsRef.current, dCol, configFilter, cfFrom, cfTo)
      : rowsRef.current
    const value = fmtValue(computeAgg(col, configAgg, usedRows))
    let trend: string | undefined, trendUp: boolean | undefined, trendLabel: string | undefined
    if (configShowTrend && dCol && configFilter !== "all") {
      const t = deriveTrend(col, configAgg, dCol, rowsRef.current, configFilter, cfFrom, cfTo)
      if (t) { trend = t.pct; trendUp = t.up; trendLabel = t.label }
    }
    const ref = dCol ? dataMaxDate(rowsRef.current, dCol) : null
    const filterLabel = ref ? computeFilterLabel(configFilter, ref, cfFrom, cfTo) : null
    const stat: StatConfig = {
      column: configCol, agg: configAgg, label, value,
      filter: configFilter, filterFrom: cfFrom, filterTo: cfTo, filterLabel: filterLabel ?? undefined,
      trend, trendUp, trendLabel,
    }
    if (editingId) {
      setLayout(prev => prev.map(it => it.id === editingId ? { ...it, stat } : it))
      setEditingId(null)
    } else if (pendingPos) {
      const { x, y } = pendingPos
      const id = `stat-${Date.now()}`
      setLayout(prev => {
        const cw = canvasW
        const withNew: LayoutItem[] = [...prev, { id, x, y, w: GHOST_W, h: GHOST_H, type: "stat", stat }]
        const pos = resolveCollision(id, x, y, GHOST_W, GHOST_H, withNew, cw, true) ?? { x, y }
        return [...prev, { id, x: pos.x, y: pos.y, w: GHOST_W, h: GHOST_H, type: "stat", stat }]
      })
      setPendingPos(null)
    }
  }, [pendingPos, editingId, configCol, configAgg, configTitle, configFilter, configDateRange, configShowTrend, pushHistory])

  const handleChartConfirm = useCallback(() => {
    if (!pendingChartPos && !editingChartId) return
    if (!chartConfigXCol || !chartConfigYCol) return
    pushHistory()
    const dCol = columnsRef.current.find(c => c.type === "date")
    const ref  = dCol ? dataMaxDate(rowsRef.current, dCol) : null
    const autoTitle = `${AGG_LABELS[chartConfigAgg]} ${chartConfigYCol} by ${chartConfigXCol}`
    const chart: ChartConfig = {
      type: chartDialogType,
      xCol: chartConfigXCol,
      yCol: chartConfigYCol,
      agg: chartConfigAgg,
      title: chartConfigTitle.trim() || autoTitle,
      filter: chartConfigFilter,
      filterLabel: ref ? computeFilterLabel(chartConfigFilter, ref) ?? undefined : undefined,
      ...((chartDialogType === "line" || chartDialogType === "area") && {
        yCol2: chartConfigYCol2 || undefined,
        smooth: chartConfigSmooth,
      }),
      ...(chartDialogType === "line" && {
        showLabels: chartConfigShowLabels,
      }),
      ...(chartDialogType === "area" && {
        stacked: chartConfigStacked,
        showLegend: chartConfigShowLegend,
      }),
      ...(chartDialogType === "pie" && {
        showCenter: chartConfigShowCenter,
        showLegend: chartConfigShowLegend,
      }),
      ...(chartDialogType === "bar" && {
        orientation: chartConfigOrientation,
      }),
    }
    if (editingChartId) {
      setLayout(prev => prev.map(it => it.id === editingChartId ? { ...it, chart } : it))
      setEditingChartId(null)
    } else if (pendingChartPos) {
      const { x, y } = pendingChartPos
      const id = `chart-${Date.now()}`
      setLayout(prev => {
        const cw = canvasW
        const withNew: LayoutItem[] = [...prev, { id, x, y, w: CHART_GHOST_W, h: CHART_GHOST_H, type: "chart", chart }]
        const pos = resolveCollision(id, x, y, CHART_GHOST_W, CHART_GHOST_H, withNew, cw, true) ?? { x, y }
        return [...prev, { id, x: pos.x, y: pos.y, w: CHART_GHOST_W, h: CHART_GHOST_H, type: "chart", chart }]
      })
      setPendingChartPos(null)
    }
  }, [pendingChartPos, editingChartId, chartDialogType, chartConfigXCol, chartConfigYCol, chartConfigYCol2, chartConfigAgg, chartConfigTitle, chartConfigFilter, chartConfigSmooth, chartConfigShowLabels, chartConfigStacked, chartConfigShowLegend, chartConfigShowCenter, chartConfigOrientation, pushHistory])

  const handleTableConfirm = useCallback(() => {
    if (!pendingTablePos && !editingTableId) return
    if (tableConfigCols.length === 0) return
    pushHistory()
    const dCol = columnsRef.current.find(c => c.type === "date")
    const ref  = dCol ? dataMaxDate(rowsRef.current, dCol) : null
    const table: TableConfig = {
      title: tableConfigTitle.trim(),
      cols: tableConfigCols,
      filter: tableConfigFilter,
      filterLabel: ref ? computeFilterLabel(tableConfigFilter, ref) ?? undefined : undefined,
    }
    if (editingTableId) {
      setLayout(prev => prev.map(it => it.id === editingTableId ? { ...it, table } : it))
      setEditingTableId(null)
    } else if (pendingTablePos) {
      const { x, y } = pendingTablePos
      const id = `table-${Date.now()}`
      setLayout(prev => {
        const cw = canvasW
        const withNew: LayoutItem[] = [...prev, { id, x, y, w: CHART_GHOST_W, h: CHART_GHOST_H, type: "table", table }]
        const pos = resolveCollision(id, x, y, CHART_GHOST_W, CHART_GHOST_H, withNew, cw, true) ?? { x, y }
        return [...prev, { id, x: pos.x, y: pos.y, w: CHART_GHOST_W, h: CHART_GHOST_H, type: "table", table }]
      })
      setPendingTablePos(null)
    }
  }, [pendingTablePos, editingTableId, tableConfigTitle, tableConfigCols, tableConfigFilter, pushHistory])

  // ── derived ──
  const numCols    = columns.filter(c => c.type === "number")
  const catCols    = columns.filter(c => c.type !== "number" && c.type !== "id")
  const dateCol    = columns.find(c => c.type === "date")
  const hasDates   = !!dateCol
  const dataMaxRef = dateCol ? dataMaxDate(rows, dateCol) : null
  const previewCol      = numCols.find(c => c.name === configCol)
  const toIso  = (d: Date) => d.toISOString().split("T")[0]
  const cfFrom = configDateRange?.from ? toIso(configDateRange.from) : undefined
  const cfTo   = configDateRange?.to   ? toIso(configDateRange.to)   : undefined
  const previewRows        = previewCol && dateCol && configFilter !== "all"
    ? filterRows(rows, dateCol, configFilter, cfFrom, cfTo)
    : rows
  const previewVal         = previewCol ? fmtValue(computeAgg(previewCol, configAgg, previewRows)) : null
  const previewTrend       = previewCol && dateCol && configShowTrend && configFilter !== "all"
    ? deriveTrend(previewCol, configAgg, dateCol, rows, configFilter, cfFrom, cfTo)
    : null
  const previewFilterLabel = dataMaxRef ? computeFilterLabel(configFilter, dataMaxRef, cfFrom, cfTo) : null
  const canvasMinH = layout.reduce((m, it) => Math.max(m, it.y + it.h), 0) + SNAP * 2

  return (
    <PaletteContext.Provider value={palette}>
      {/* ── stat card config dialog ── */}
      <Dialog open={pendingPos !== null || editingId !== null} onOpenChange={open => { if (!open) { setPendingPos(null); setEditingId(null); setShowDatePicker(false); setDatePickerPos(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit stat card" : "Configure stat card"}</DialogTitle>
            <DialogDescription>{editingId ? "Update the metric displayed on this card." : "Choose which metric to display on this card."}</DialogDescription>
          </DialogHeader>

          {numCols.length === 0 ? (
            <p className="text-sm text-muted-foreground">No numeric columns found in the connected sheet. Paste a sheet URL with number data to get started.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stat-title">Title <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="stat-title"
                  value={configTitle}
                  onChange={e => setConfigTitle(e.target.value)}
                  placeholder={`${AGG_LABELS[configAgg]} ${configCol}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stat-col">Metric</Label>
                <NativeSelect id="stat-col" value={configCol} onChange={e => setConfigCol(e.target.value)} className="w-full">
                  {numCols.map(c => <NativeSelectOption key={c.name} value={c.name}>{c.name}</NativeSelectOption>)}
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stat-agg">Show</Label>
                <NativeSelect id="stat-agg" value={configAgg} onChange={e => setConfigAgg(e.target.value as Agg)} className="w-full">
                  <NativeSelectOption value="sum">Sum</NativeSelectOption>
                  <NativeSelectOption value="avg">Average</NativeSelectOption>
                  <NativeSelectOption value="count">Count</NativeSelectOption>
                  <NativeSelectOption value="max">Maximum</NativeSelectOption>
                  <NativeSelectOption value="min">Minimum</NativeSelectOption>
                </NativeSelect>
              </div>

              {hasDates && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="stat-filter">Period</Label>
                      {dataMaxRef && (
                        <span className="text-xs text-muted-foreground">
                          Data through {dataMaxRef.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    <NativeSelect id="stat-filter" value={configFilter} onChange={e => { setConfigFilter(e.target.value as FilterPeriod); setConfigDateRange(undefined); setShowDatePicker(false); setConfigShowTrend(false) }} className="w-full">
                      <NativeSelectOption value="all">All time</NativeSelectOption>
                      <NativeSelectOption value="this_week">Current week</NativeSelectOption>
                      <NativeSelectOption value="last_week">Last completed week</NativeSelectOption>
                      <NativeSelectOption value="this_month">Current month</NativeSelectOption>
                      <NativeSelectOption value="last_month">Last completed month</NativeSelectOption>
                      <NativeSelectOption value="this_quarter">Current quarter</NativeSelectOption>
                      <NativeSelectOption value="last_quarter">Last completed quarter</NativeSelectOption>
                      <NativeSelectOption value="this_year">Current year</NativeSelectOption>
                      <NativeSelectOption value="last_year">Last completed year</NativeSelectOption>
                      <NativeSelectOption value="last_7d">Last 7 days</NativeSelectOption>
                      <NativeSelectOption value="last_30d">Last 30 days</NativeSelectOption>
                      <NativeSelectOption value="last_90d">Last 90 days</NativeSelectOption>
                      <NativeSelectOption value="custom">Custom range…</NativeSelectOption>
                    </NativeSelect>
                  </div>

                  {configFilter === "custom" && (
                    <div className="flex flex-col gap-1.5">
                      <Label>Date range</Label>
                      <button
                        ref={dateAnchorRef}
                        type="button"
                        onClick={() => {
                          if (!showDatePicker && dateAnchorRef.current) {
                            const r = dateAnchorRef.current.getBoundingClientRect()
                            setDatePickerPos({ top: r.bottom + 6, left: r.left })
                          }
                          setShowDatePicker(p => !p)
                        }}
                        className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm text-left hover:bg-accent/50 transition-colors"
                      >
                        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                        {configDateRange?.from ? (
                          <span>
                            {configDateRange.from.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            {configDateRange.to
                              ? ` – ${configDateRange.to.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                              : <span className="text-muted-foreground"> – pick end</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Pick a date range</span>
                        )}
                      </button>
                    </div>
                  )}

                  {configFilter !== "all" && !(configFilter === "custom" && (!configDateRange?.from || !configDateRange?.to)) && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={configShowTrend}
                        onChange={e => setConfigShowTrend(e.target.checked)}
                        className="size-4 rounded border-input accent-primary"
                      />
                      <span className="text-sm text-muted-foreground">
                        Compare to previous period
                        {previewTrend && <span className="text-foreground"> · {previewTrend.label}</span>}
                      </span>
                    </label>
                  )}

                  {configShowTrend && configFilter !== "all" && !previewTrend && (
                    <p className="text-xs text-muted-foreground -mt-1">Not enough data to compare periods.</p>
                  )}
                </div>
              )}

              {previewVal !== null && (() => {
                const previewLabel = configTitle.trim() || [AGG_LABELS[configAgg], configCol, previewFilterLabel].filter(Boolean).join(" · ")
                const PreviewTrendIcon = previewTrend?.up === false ? TrendingDownIcon : TrendingUpIcon
                return (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">Preview</p>
                    <Card className="bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card pointer-events-none select-none">
                      <CardHeader>
                        <CardDescription>{previewLabel}</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums">{previewVal}</CardTitle>
                        {previewTrend && (
                          <CardAction>
                            <Badge variant="outline">
                              <PreviewTrendIcon />
                              {previewTrend.pct}
                            </Badge>
                          </CardAction>
                        )}
                      </CardHeader>
                      <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex items-center gap-2 font-medium">
                          {previewTrend
                            ? <>{previewTrend.up ? "Trending up" : "Trending down"} <PreviewTrendIcon className="size-4" /> {previewTrend.label}</>
                            : previewFilterLabel ?? `${AGG_LABELS[configAgg]} of ${configCol}`}
                        </div>
                        {previewTrend
                          ? previewFilterLabel && <div className="text-muted-foreground">{previewFilterLabel}</div>
                          : <div className="text-muted-foreground">{AGG_LABELS[configAgg]} of {configCol}</div>}
                      </CardFooter>
                    </Card>
                  </div>
                )
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingPos(null); setEditingId(null) }}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!configCol || numCols.length === 0 || (configFilter === "custom" && (!configDateRange?.from || !configDateRange?.to))}>{editingId ? "Save changes" : "Add to dashboard"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── chart config dialog ── */}
      {(() => {
        const previewChartItem: LayoutItem = {
          id: "dialog-preview", x: 0, y: 0, w: 480, h: 320, type: "chart",
          chart: {
            type: chartDialogType,
            xCol: chartConfigXCol,
            yCol: chartConfigYCol,
            yCol2: chartConfigYCol2 || undefined,
            agg: chartConfigAgg,
            title: chartConfigTitle,
            filter: chartConfigFilter,
            smooth: chartConfigSmooth,
            showLabels: chartConfigShowLabels,
            stacked: chartConfigStacked,
            showLegend: chartConfigShowLegend,
            showCenter: chartConfigShowCenter,
            orientation: chartConfigOrientation,
          },
        }
        const hasPreviewData = !!(chartConfigXCol && chartConfigYCol)
        return (
          <Dialog open={pendingChartPos !== null || editingChartId !== null} onOpenChange={open => { if (!open) { setPendingChartPos(null); setEditingChartId(null) } }}>
            <DialogContent className="p-0 gap-0 flex flex-col overflow-hidden" style={{ maxWidth: '56rem', maxHeight: '90vh' }}>
              <DialogHeader className="px-6 pt-6 pb-4 flex-none border-b border-border">
                <DialogTitle>{editingChartId ? `Edit ${chartDialogType} chart` : `Configure ${chartDialogType} chart`}</DialogTitle>
                <DialogDescription>Choose the columns to plot.</DialogDescription>
              </DialogHeader>

              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* ── Left: form fields ── */}
                <div className="w-72 flex-none overflow-y-auto p-6 flex flex-col gap-4 border-r border-border">
                  {numCols.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No numeric columns found in the connected sheet.</p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="chart-title">Title <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input
                          id="chart-title"
                          value={chartConfigTitle}
                          onChange={e => setChartConfigTitle(e.target.value)}
                          placeholder={chartConfigXCol && chartConfigYCol ? `${AGG_LABELS[chartConfigAgg]} ${chartConfigYCol} by ${chartConfigXCol}` : "Chart title"}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="chart-x">{chartDialogType === "pie" ? "Slice by (category)" : "X axis (categories)"}</Label>
                        <NativeSelect id="chart-x" value={chartConfigXCol} onChange={e => setChartConfigXCol(e.target.value)} className="w-full">
                          {catCols.map(c => <NativeSelectOption key={c.name} value={c.name}>{c.name}</NativeSelectOption>)}
                        </NativeSelect>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="chart-y">Y axis (values)</Label>
                        <NativeSelect id="chart-y" value={chartConfigYCol} onChange={e => setChartConfigYCol(e.target.value)} className="w-full">
                          {numCols.map(c => <NativeSelectOption key={c.name} value={c.name}>{c.name}</NativeSelectOption>)}
                        </NativeSelect>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="chart-agg">Aggregation</Label>
                        <NativeSelect id="chart-agg" value={chartConfigAgg} onChange={e => setChartConfigAgg(e.target.value as Agg)} className="w-full">
                          <NativeSelectOption value="sum">Sum</NativeSelectOption>
                          <NativeSelectOption value="avg">Average</NativeSelectOption>
                          <NativeSelectOption value="count">Count</NativeSelectOption>
                          <NativeSelectOption value="max">Maximum</NativeSelectOption>
                          <NativeSelectOption value="min">Minimum</NativeSelectOption>
                        </NativeSelect>
                      </div>

                      {hasDates && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-baseline justify-between">
                            <Label htmlFor="chart-filter">Period</Label>
                            {dataMaxRef && (
                              <span className="text-xs text-muted-foreground">
                                {dataMaxRef.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>
                          <NativeSelect id="chart-filter" value={chartConfigFilter} onChange={e => setChartConfigFilter(e.target.value as FilterPeriod)} className="w-full">
                            <NativeSelectOption value="all">All time</NativeSelectOption>
                            <NativeSelectOption value="this_month">Current month</NativeSelectOption>
                            <NativeSelectOption value="last_month">Last completed month</NativeSelectOption>
                            <NativeSelectOption value="this_quarter">Current quarter</NativeSelectOption>
                            <NativeSelectOption value="last_quarter">Last completed quarter</NativeSelectOption>
                            <NativeSelectOption value="this_year">Current year</NativeSelectOption>
                            <NativeSelectOption value="last_year">Last completed year</NativeSelectOption>
                            <NativeSelectOption value="last_7d">Last 7 days</NativeSelectOption>
                            <NativeSelectOption value="last_30d">Last 30 days</NativeSelectOption>
                            <NativeSelectOption value="last_90d">Last 90 days</NativeSelectOption>
                          </NativeSelect>
                        </div>
                      )}

                      {chartDialogType === "bar" && (
                        <div className="flex flex-col gap-1.5">
                          <Label>Orientation</Label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setChartConfigOrientation("vertical")}
                              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition-colors ${chartConfigOrientation !== "horizontal" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
                            >
                              <BarChart2Icon className="size-3.5" /> Vertical
                            </button>
                            <button
                              type="button"
                              onClick={() => setChartConfigOrientation("horizontal")}
                              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition-colors ${chartConfigOrientation === "horizontal" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
                            >
                              <BarChartHorizontalIcon className="size-3.5" /> Horizontal
                            </button>
                          </div>
                        </div>
                      )}

                      {chartDialogType === "pie" && (
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={chartConfigShowCenter} onChange={e => setChartConfigShowCenter(e.target.checked)} className="size-4 rounded border-input accent-primary" />
                            <span className="text-sm text-muted-foreground">Show center total</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={chartConfigShowLegend} onChange={e => setChartConfigShowLegend(e.target.checked)} className="size-4 rounded border-input accent-primary" />
                            <span className="text-sm text-muted-foreground">Show legend</span>
                          </label>
                        </div>
                      )}

                      {(chartDialogType === "line" || chartDialogType === "area") && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="chart-y2">Second series <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <NativeSelect id="chart-y2" value={chartConfigYCol2} onChange={e => { setChartConfigYCol2(e.target.value); if (!e.target.value) { setChartConfigStacked(false); setChartConfigShowLegend(false) } }} className="w-full">
                              <NativeSelectOption value="">None</NativeSelectOption>
                              {numCols.filter(c => c.name !== chartConfigYCol).map(c => (
                                <NativeSelectOption key={c.name} value={c.name}>{c.name}</NativeSelectOption>
                              ))}
                            </NativeSelect>
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" checked={chartConfigSmooth} onChange={e => setChartConfigSmooth(e.target.checked)} className="size-4 rounded border-input accent-primary" />
                              <span className="text-sm text-muted-foreground">Smooth curve</span>
                            </label>
                            {chartDialogType === "line" && (
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={chartConfigShowLabels} onChange={e => setChartConfigShowLabels(e.target.checked)} className="size-4 rounded border-input accent-primary" />
                                <span className="text-sm text-muted-foreground">Show data labels</span>
                              </label>
                            )}
                            {chartDialogType === "area" && chartConfigYCol2 && (
                              <>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input type="checkbox" checked={chartConfigStacked} onChange={e => setChartConfigStacked(e.target.checked)} className="size-4 rounded border-input accent-primary" />
                                  <span className="text-sm text-muted-foreground">Stack series</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input type="checkbox" checked={chartConfigShowLegend} onChange={e => setChartConfigShowLegend(e.target.checked)} className="size-4 rounded border-input accent-primary" />
                                  <span className="text-sm text-muted-foreground">Show legend</span>
                                </label>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* ── Right: live preview ── */}
                <div className="flex-1 flex flex-col p-5 bg-muted/30 min-w-0 min-h-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-3">Preview</p>
                  {hasPreviewData ? (
                    // Explicit height so Recharts can measure — flex-1 alone gives 0px
                    <div className="overflow-hidden rounded-xl border border-border" style={{ flex: "1 1 0", minHeight: 260 }}>
                      {chartPreviewReady && (chartDialogType === "line"
                        ? <LineCard  item={previewChartItem} columns={columns} rows={rows} isPreview />
                        : chartDialogType === "area"
                        ? <AreaCard  item={previewChartItem} columns={columns} rows={rows} isPreview />
                        : chartDialogType === "pie"
                        ? <PieCard   item={previewChartItem} columns={columns} rows={rows} isPreview />
                        : <ChartCard item={previewChartItem} columns={columns} rows={rows} isPreview onToggleOrientation={() => setChartConfigOrientation(prev => prev === "horizontal" ? "vertical" : "horizontal")} />)}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground" style={{ flex: "1 1 0", minHeight: 260 }}>
                      Select columns to see a preview
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-none justify-end gap-2 px-6 py-4 border-t border-border bg-muted/50">
                <Button variant="outline" onClick={() => { setPendingChartPos(null); setEditingChartId(null) }}>Cancel</Button>
                <Button onClick={handleChartConfirm} disabled={!chartConfigXCol || !chartConfigYCol}>
                  {editingChartId ? "Save changes" : "Add to dashboard"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* ── table config dialog ── */}
      <Dialog open={pendingTablePos !== null || editingTableId !== null} onOpenChange={open => { if (!open) { setPendingTablePos(null); setEditingTableId(null) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingTableId ? "Edit table" : "Configure table"}</DialogTitle>
            <DialogDescription>Choose which columns to display.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="table-title">Title <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="table-title"
                value={tableConfigTitle}
                onChange={e => setTableConfigTitle(e.target.value)}
                placeholder="Data Table"
              />
            </div>

            {hasDates && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="table-filter">Period</Label>
                <NativeSelect id="table-filter" value={tableConfigFilter} onChange={e => setTableConfigFilter(e.target.value as FilterPeriod)} className="w-full">
                  <NativeSelectOption value="all">All time</NativeSelectOption>
                  <NativeSelectOption value="this_month">Current month</NativeSelectOption>
                  <NativeSelectOption value="last_month">Last completed month</NativeSelectOption>
                  <NativeSelectOption value="this_quarter">Current quarter</NativeSelectOption>
                  <NativeSelectOption value="last_quarter">Last completed quarter</NativeSelectOption>
                  <NativeSelectOption value="this_year">Current year</NativeSelectOption>
                  <NativeSelectOption value="last_year">Last completed year</NativeSelectOption>
                  <NativeSelectOption value="last_7d">Last 7 days</NativeSelectOption>
                  <NativeSelectOption value="last_30d">Last 30 days</NativeSelectOption>
                  <NativeSelectOption value="last_90d">Last 90 days</NativeSelectOption>
                </NativeSelect>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <Label>Columns</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setTableConfigCols(
                    tableConfigCols.length === columns.length ? [] : columns.map(c => c.name)
                  )}
                >
                  {tableConfigCols.length === columns.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                {columns.map(col => (
                  <label key={col.name} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tableConfigCols.includes(col.name)}
                      onChange={e => setTableConfigCols(prev =>
                        e.target.checked ? [...prev, col.name] : prev.filter(n => n !== col.name)
                      )}
                      className="size-4 rounded border-input accent-primary"
                    />
                    <span className="text-sm text-muted-foreground truncate">{col.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingTablePos(null); setEditingTableId(null) }}>Cancel</Button>
            <Button onClick={handleTableConfirm} disabled={tableConfigCols.length === 0}>
              {editingTableId ? "Save changes" : "Add to dashboard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── text tile edit dialog ── */}
      {editingTextId && (() => {
        const textItem = layout.find(it => it.id === editingTextId)
        return textItem ? (
          <TextEditDialog
            item={textItem}
            onSave={html => {
              pushHistory()
              setLayout(prev => prev.map(it =>
                it.id === editingTextId && it.text ? { ...it, text: { ...it.text, content: html } } : it
              ))
            }}
            onClose={() => setEditingTextId(null)}
          />
        ) : null
      })()}

      {/* ── canvas viewport ── */}
      <div ref={outerRef} className="flex-1 overflow-hidden relative bg-muted/60" style={{ cursor: 'grab' }} onMouseDown={onGutterMouseDown} onContextMenu={onViewportContextMenu}>
        <div
          ref={canvasRef}
          data-dashboard-canvas
          className="absolute top-0 left-0 bg-background shadow-md rounded-xl overflow-hidden"
          style={{ width: LOGICAL_W, height: canvasMinH, transformOrigin: '0 0', willChange: 'transform' }}
          onMouseDown={onPanStart}
          onContextMenu={onViewportContextMenu}
        >
          {dragging && <div className="fixed inset-0 z-40 cursor-grabbing" />}
          <div className={`dot-grid pointer-events-none absolute inset-0 transition-opacity duration-500 ${dragging ? "opacity-100" : "opacity-[0.08]"}`} />
          {dropGhost && (
            <div aria-hidden className="pointer-events-none absolute rounded-xl border border-dashed border-muted-foreground/25 bg-muted/15"
              style={{ left: dropGhost.x, top: dropGhost.y, width: dropGhost.w, height: dropGhost.h }} />
          )}

          {layout.map(item => (
            <GridItem
              key={item.id} item={item} canvasW={canvasW} viewportRef={viewportRef}
              projectedX={dragProjection?.get(item.id)?.x}
              projectedY={dragProjection?.get(item.id)?.y}
              isSelected={selectedId === item.id}
              onSelect={() => setSelectedId(item.id)}
              onUpdate={onUpdate} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragMove={onDragMove}
              onResizeEnd={() => { isResizingRef.current = false }}
              onEdit={() => handleEdit(item.id)}
              onDuplicate={() => { handleDuplicate(item.id); setSelectedId(null) }}
              onDelete={() => { handleDelete(item.id); setSelectedId(null) }}
            >
              {item.type === "text"
                ? <TextCard item={item} onEdit={() => setEditingTextId(item.id)} />
                : item.type === "table"
                ? <TableCard item={item} columns={columns} rows={rows} />
                : item.type === "stat"
                ? <StatCard item={item} />
                : item.chart?.type === "line"
                  ? <LineCard item={item} columns={columns} rows={rows} />
                  : item.chart?.type === "area"
                  ? <AreaCard item={item} columns={columns} rows={rows} />
                  : item.chart?.type === "pie"
                  ? <PieCard item={item} columns={columns} rows={rows} />
                  : <ChartCard
                      item={item}
                      columns={columns}
                      rows={rows}
                      onToggleOrientation={() => setLayout(prev => prev.map(it =>
                        it.id === item.id && it.chart
                          ? { ...it, chart: { ...it.chart, orientation: it.chart.orientation === "horizontal" ? "vertical" : "horizontal" } }
                          : it
                      ))}
                    />}
            </GridItem>
          ))}
        </div>{/* canvas */}

        {/* zoom controls */}
        <div className="absolute bottom-4 right-4 z-50 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-md px-2 py-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => doZoom(0.8)}>
            <span className="text-sm leading-none">−</span>
          </Button>
          <span ref={zoomLabelRef} className="text-xs tabular-nums w-10 text-center text-muted-foreground select-none">100%</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => doZoom(1.25)}>
            <span className="text-sm leading-none">+</span>
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={fitToWindow} title="Fit to window">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground"><rect x="1" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/></svg>
          </Button>
        </div>
      </div>{/* outer viewport */}

      {canvasMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[200]" onContextMenu={e => e.preventDefault()} onClick={() => setCanvasMenu(null)} />
          <div
            className="fixed z-[201] min-w-[180px] rounded-lg border border-border bg-popover shadow-xl overflow-hidden py-1"
            style={{ top: canvasMenu.y, left: canvasMenu.x }}
          >
            <button
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-not-allowed opacity-50"
              disabled
            >
              <SaveIcon className="size-3.5 shrink-0" />
              Save
            </button>
            <button
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-not-allowed opacity-50"
              disabled
            >
              <Share2Icon className="size-3.5 shrink-0" />
              Share
            </button>
            <button
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-not-allowed opacity-50"
              disabled
            >
              <ImageIcon className="size-3.5 shrink-0" />
              Export as image
            </button>
            <div className="my-1 border-t border-border" />
            <button
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => { fitToWindow(); setCanvasMenu(null) }}
            >
              <ScanIcon className="size-3.5 shrink-0" />
              Fit to window
            </button>
            <button
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => { doZoom(1.25); setCanvasMenu(null) }}
            >
              <ZoomInIcon className="size-3.5 shrink-0" />
              Zoom in
            </button>
            <button
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => { doZoom(0.8); setCanvasMenu(null) }}
            >
              <ZoomOutIcon className="size-3.5 shrink-0" />
              Zoom out
            </button>
          </div>
        </>,
        document.body
      )}

      {showDatePicker && datePickerPos && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setShowDatePicker(false)} />
          <div
            className="fixed z-[101] rounded-lg border border-border bg-popover shadow-xl overflow-hidden"
            style={{ top: datePickerPos.top, left: datePickerPos.left }}
          >
            <Calendar
              mode="range"
              selected={configDateRange}
              onSelect={range => {
                setConfigDateRange(range)
                if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) setShowDatePicker(false)
              }}
            />
          </div>
        </>,
        document.body
      )}

    </PaletteContext.Provider>
  )
}
