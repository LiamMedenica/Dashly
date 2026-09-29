"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Sun, Moon, LogOut, Zap, LayoutGrid, Palette, Sparkles,
  Share2, SlidersHorizontal, BarChart2, Check, ChevronDown, X,
} from "lucide-react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog, DialogContent, DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

gsap.registerPlugin(ScrollTrigger)

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthMode = "signin" | "signup"

// ─── Nav / page data ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features",     href: "#features"     },
  { label: "Pricing",      href: "#pricing"      },
  { label: "About",        href: "#about"        },
  { label: "FAQ",          href: "#faq"          },
]

const HOW_IT_WORKS = [
  { step: "01", title: "Paste your Google Sheets link",  desc: "Copy the share URL from your spreadsheet. No exports, no API keys — we read it directly." },
  { step: "02", title: "AI builds your dashboard",       desc: "Our AI reads your columns, picks the right chart types and lays everything out in seconds." },
  { step: "03", title: "Customise and share",            desc: "Drag tiles, swap chart types, pick a colour theme. Share a public link — no account needed to view." },
]

const FEATURES = [
  { icon: Zap,               title: "AI-powered generation",    desc: "Paste a link and get a complete dashboard in seconds. The AI handles chart selection, aggregation and layout."          },
  { icon: LayoutGrid,        title: "Drag-and-drop canvas",     desc: "Resize and rearrange every tile freely. Tiles snap to a grid and push each other out of the way automatically."       },
  { icon: Palette,           title: "Beautiful themes",         desc: "Choose from 6 colour palettes or build your own. Every chart updates instantly — no code required."                    },
  { icon: Share2,            title: "Share with anyone",        desc: "One public link. Viewers see your live dashboard without needing a DataBubble account."                                },
  { icon: SlidersHorizontal, title: "Live cross-chart filters", desc: "Click any bar or pie slice to filter every chart at once. Date range sliders built in."                               },
  { icon: BarChart2,         title: "6 chart types",            desc: "Bar, line, area, pie, stat cards and data tables — all with live previews and dual-series support."                   },
]

const PRICING = [
  {
    name: "Free", usdPrice: "$0", gbpPrice: "£0", period: "forever",
    desc: "Try DataBubble with no commitment.",
    features: ["1 saved dashboard", "All 6 chart types", "AI dashboard generation", "Live filters & date ranges"],
    cta: "Get started free", highlighted: false,
  },
  {
    name: "Starter", usdPrice: "$9.99", gbpPrice: "£7.99", period: "per month",
    desc: "For individuals and freelancers.",
    features: ["10 saved dashboards", "Everything in Free", "Public sharing links", "All colour themes", "Priority support"],
    cta: "Start free trial", highlighted: true,
  },
  {
    name: "Pro", usdPrice: "$17.99", gbpPrice: "£15.99", period: "per month",
    desc: "For teams and growing businesses.",
    features: ["20 saved dashboards", "Everything in Starter", "Custom branding", "Early access to new features"],
    cta: "Start free trial", highlighted: false,
  },
]

const FAQ = [
  { q: "Do I need an account to create a dashboard?",  a: "No — paste a Google Sheets link and get a full dashboard straight away. You only need an account when you want to save or share it." },
  { q: "How does the AI generate my dashboard?",        a: "We send your column names and a sample of your data to an AI model. It decides which chart types suit your data, how to group and aggregate values, and lay everything out. The whole thing takes a few seconds." },
  { q: "Is my Google Sheets data safe?",                a: "We only read sheets set to \"Anyone with the link can view\". We never store your raw spreadsheet data — only the dashboard layout you create." },
  { q: "Can I share my dashboard publicly?",            a: "Yes. Any dashboard can be shared via a public link. Viewers see it live without needing a DataBubble account." },
  { q: "Can I cancel my Pro plan anytime?",             a: "Absolutely. Cancel with one click. Your dashboards stay on the free plan (up to 1 saved dashboard)." },
]

// ─── Showcase data ─────────────────────────────────────────────────────────────
// Multi-dimensional fake e-commerce dataset powering the interactive preview.

const SHOWCASE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]

const SHOWCASE_RAW = [
  { month: "Jan", cat: "Online",    rev: 2800, orders: 95  },
  { month: "Jan", cat: "In-Store",  rev: 1400, orders: 47  },
  { month: "Jan", cat: "Corporate", rev: 800,  orders: 12  },
  { month: "Feb", cat: "Online",    rev: 3200, orders: 108 },
  { month: "Feb", cat: "In-Store",  rev: 1900, orders: 64  },
  { month: "Feb", cat: "Corporate", rev: 1100, orders: 16  },
  { month: "Mar", cat: "Online",    rev: 2900, orders: 99  },
  { month: "Mar", cat: "In-Store",  rev: 1600, orders: 52  },
  { month: "Mar", cat: "Corporate", rev: 900,  orders: 13  },
  { month: "Apr", cat: "Online",    rev: 4100, orders: 138 },
  { month: "Apr", cat: "In-Store",  rev: 2200, orders: 72  },
  { month: "Apr", cat: "Corporate", rev: 1400, orders: 19  },
  { month: "May", cat: "Online",    rev: 4800, orders: 162 },
  { month: "May", cat: "In-Store",  rev: 2400, orders: 80  },
  { month: "May", cat: "Corporate", rev: 1700, orders: 23  },
  { month: "Jun", cat: "Online",    rev: 4400, orders: 148 },
  { month: "Jun", cat: "In-Store",  rev: 2200, orders: 73  },
  { month: "Jun", cat: "Corporate", rev: 1500, orders: 21  },
  { month: "Jul", cat: "Online",    rev: 5300, orders: 179 },
  { month: "Jul", cat: "In-Store",  rev: 2700, orders: 89  },
  { month: "Jul", cat: "Corporate", rev: 1900, orders: 26  },
]

const CATEGORIES = ["Online", "In-Store", "Corporate"]

const SHOWCASE_THEMES = [
  { name: "Violet", color: "#7c3aed", bg: "#faf9ff", pieColors: ["#7c3aed", "#a78bfa", "#c4b5fd"] },
  { name: "Rose",   color: "#e11d48", bg: "#fff5f7", pieColors: ["#e11d48", "#fb7185", "#fda4af"] },
  { name: "Teal",   color: "#0d9488", bg: "#f0fdf9", pieColors: ["#0d9488", "#2dd4bf", "#99f6e4"] },
  { name: "Blue",   color: "#2563eb", bg: "#eff6ff", pieColors: ["#1d4ed8", "#3b82f6", "#93c5fd"] },
  { name: "Amber",  color: "#d97706", bg: "#fffbf0", pieColors: ["#d97706", "#f59e0b", "#fde68a"] },
  { name: "Coral",  color: "#f97316", bg: "#fff8f0", pieColors: ["#ea580c", "#f97316", "#fdba74"] },
]

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCurrency() {
  const [gbp, setGbp] = useState(false)
  useEffect(() => {
    const lang = navigator.language ?? ""
    setGbp(lang === "en-GB" || lang.startsWith("en-GB"))
  }, [])
  return gbp
}

/**
 * Animates a number from its previous value to `target` every time target changes.
 * Starts from 0 on mount so the initial render feels alive.
 */
function useCountUp(target: number, duration = 650) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - t) ** 3 // ease-out cubic
      const cur = Math.round(from + (target - from) * eased)
      setDisplay(cur)
      fromRef.current = cur
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return display
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scrollTo(href: string) {
  document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function fmtCurrency(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
}

// ─── StatsStrip ───────────────────────────────────────────────────────────────

function StatsStrip() {
  return (
    <div className="border-y border-border/60 bg-white/90 dark:bg-background/90 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-10 sm:gap-20">
        {[
          { value: "30s", label: "Average setup time" },
          { value: "6", label: "Chart types built in" },
          { value: "1-click", label: "Public sharing" },
          { value: "Free", label: "To get started" },
        ].map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className="text-2xl font-bold text-blue-500">{value}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── BubbleBackground ─────────────────────────────────────────────────────────

function BubbleBackground() {
  const bubbles = [
    { size: 480, top: "-120px",  right: "-100px", color: "#bfdbfe", opacity: 0.35, blur: 80, dur: 8,  delay: 0   },
    { size: 340, bottom: "0px",  left:  "-120px", color: "#93c5fd", opacity: 0.25, blur: 70, dur: 10, delay: 2   },
    { size: 200, top:  "35%",    left:   "8%",    color: "#bfdbfe", opacity: 0.30, blur: 50, dur: 7,  delay: 1   },
    { size: 130, top:  "15%",    right:  "18%",   color: "#60a5fa", opacity: 0.20, blur: 40, dur: 9,  delay: 3   },
    { size:  90, top:  "60%",    right:   "8%",   color: "#93c5fd", opacity: 0.30, blur: 30, dur: 6,  delay: 1.5 },
    { size:  70, top:   "8%",    left:   "38%",   color: "#bfdbfe", opacity: 0.35, blur: 25, dur: 11, delay: 0.5 },
  ]
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <style>{`@keyframes db-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-18px) scale(1.03)}}@keyframes db-fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes db-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      {bubbles.map((b, i) => (
        <div key={i} className="absolute rounded-full" style={{
          width: b.size, height: b.size,
          top: (b as { top?: string }).top, bottom: (b as { bottom?: string }).bottom,
          left: (b as { left?: string }).left, right: (b as { right?: string }).right,
          background: b.color, opacity: b.opacity,
          filter: `blur(${b.blur}px)`,
          animation: `db-float ${b.dur}s ease-in-out ${b.delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, format, accent, trendPct, trendLabel }: {
  label: string; value: number; format: "currency" | "integer"; accent: string
  trendPct?: number; trendLabel?: string
}) {
  const animated = useCountUp(value)
  const display  = format === "currency" ? fmtCurrency(animated) : animated.toLocaleString()
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 border border-black/[0.05] dark:border-white/[0.06] shadow-sm flex flex-col gap-2">
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-medium text-gray-400 dark:text-zinc-400 uppercase tracking-wide leading-none">{label}</p>
        {trendPct !== undefined && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${trendPct >= 0 ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-950 text-rose-500 dark:text-rose-400"}`}>
            {trendPct >= 0 ? "↑" : "↓"} {Math.abs(trendPct)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-800 dark:text-zinc-100 tabular-nums leading-none">{display}</p>
      <div className="flex items-center gap-2">
        <div className="h-1 w-8 rounded-full flex-shrink-0 transition-colors duration-300" style={{ background: accent }} />
        {trendLabel && <span className="text-[10px] text-gray-400 dark:text-zinc-500">vs {trendLabel}</span>}
      </div>
    </div>
  )
}

// ─── DashboardShowcase ────────────────────────────────────────────────────────

const AI_STEPS = [
  { query: "Show me Online sales from May", month: "May",  cat: "Online"    },
  { query: "What did In-Store do in July?",  month: "Jul",  cat: "In-Store"  },
  { query: "Show Corporate revenue in April", month: "Apr", cat: "Corporate" },
]

function DashboardShowcase() {
  const [activeTheme, setActiveTheme] = useState(3) // Blue default
  const [selMonth,    setSelMonth]    = useState<string | null>(null)
  const [selCat,      setSelCat]      = useState<string | null>(null)
  const [aiText,      setAiText]      = useState("")
  const [aiRunning,   setAiRunning]   = useState(false)
  const aiTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiStepRef   = useRef(0)

  const { resolvedTheme }  = useTheme()
  // mounted gate: keep isDark=false on first render so server HTML matches
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const isDark   = mounted && resolvedTheme === "dark"

  const theme    = SHOWCASE_THEMES[activeTheme]!
  const catColor = (cat: string) => theme.pieColors[CATEGORIES.indexOf(cat)] ?? theme.color

  // frame bg: use CSS dark: class so it's applied instantly from the <html class="dark"> before JS runs
  // inline style only carries the light-mode theme colour; dark: class overrides it
  const cardCls   = isDark ? "bg-zinc-800 border-white/[0.06]" : "bg-white border-black/[0.05]"
  const chromeCls = isDark ? "bg-zinc-900/80 border-white/[0.06]" : "bg-white/60 border-black/[0.06]"
  const titleClr  = isDark ? "#e4e4e7" : "#374151"
  const axisClr   = isDark ? "#71717a" : "#9ca3af"
  const gridClr   = isDark ? "#3f3f46" : "#f0f0f0"

  useEffect(() => () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }, [])

  const handleAiClick = () => {
    if (aiRunning) return
    const step = AI_STEPS[aiStepRef.current % AI_STEPS.length]!
    aiStepRef.current += 1
    setSelMonth(null); setSelCat(null); setAiText(""); setAiRunning(true)
    let i = 0
    const type = () => {
      i++
      setAiText(step.query.slice(0, i))
      if (i < step.query.length) {
        aiTimerRef.current = setTimeout(type, 38)
      } else {
        aiTimerRef.current = setTimeout(() => {
          setSelMonth(step.month); setSelCat(step.cat); setAiRunning(false)
        }, 350)
      }
    }
    aiTimerRef.current = setTimeout(type, 120)
  }

  const barData = useMemo(() =>
    SHOWCASE_MONTHS.map(m => ({
      month: m,
      revenue: SHOWCASE_RAW
        .filter(d => d.month === m && (!selCat || d.cat === selCat))
        .reduce((s, d) => s + d.rev, 0),
    })), [selCat])

  const pieData = useMemo(() =>
    CATEGORIES.map(c => ({
      name: c,
      value: SHOWCASE_RAW
        .filter(d => d.cat === c && (!selMonth || d.month === selMonth))
        .reduce((s, d) => s + d.rev, 0),
    })), [selMonth])

  const trendData = useMemo(() =>
    SHOWCASE_MONTHS.map(m => ({
      month: m,
      orders: SHOWCASE_RAW
        .filter(d => d.month === m && (!selCat || d.cat === selCat))
        .reduce((s, d) => s + d.orders, 0),
    })), [selCat])

  const { revenue, orders, avgOrder } = useMemo(() => {
    const rows = SHOWCASE_RAW.filter(d =>
      (!selMonth || d.month === selMonth) && (!selCat || d.cat === selCat)
    )
    const rev = rows.reduce((s, d) => s + d.rev, 0)
    const ord = rows.reduce((s, d) => s + d.orders, 0)
    return { revenue: rev, orders: ord, avgOrder: ord ? Math.round(rev / ord) : 0 }
  }, [selMonth, selCat])

  const kpiTrend = useMemo(() => {
    const jul = SHOWCASE_RAW.filter(d => d.month === "Jul" && (!selCat || d.cat === selCat))
    const jun = SHOWCASE_RAW.filter(d => d.month === "Jun" && (!selCat || d.cat === selCat))
    const jRev = jul.reduce((s, d) => s + d.rev, 0),    pRev = jun.reduce((s, d) => s + d.rev, 0)
    const jOrd = jul.reduce((s, d) => s + d.orders, 0), pOrd = jun.reduce((s, d) => s + d.orders, 0)
    const jAvg = jOrd ? Math.round(jRev / jOrd) : 0,   pAvg = pOrd ? Math.round(pRev / pOrd) : 0
    const pct  = (c: number, p: number) => p ? Math.round(((c - p) / p) * 100) : 0
    return { rev: pct(jRev, pRev), ord: pct(jOrd, pOrd), avg: pct(jAvg, pAvg) }
  }, [selCat])

  return (
    <div className="pt-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="reveal-up text-3xl sm:text-4xl font-bold tracking-tight">Here's what you get</h2>
          <p className="reveal-up text-muted-foreground text-lg mt-3 max-w-lg mx-auto">
            Fully interactive — click any bar or pie slice to cross-filter in real time.
          </p>
        </div>

        {/* Theme colour dots */}
        <div className="reveal-up flex items-center justify-center gap-4 mb-5">
          {SHOWCASE_THEMES.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setActiveTheme(i)}
              title={t.name}
              className="rounded-full"
              style={{
                width:      i === activeTheme ? 28 : 22,
                height:     i === activeTheme ? 28 : 22,
                background: t.color,
                boxShadow:  i === activeTheme ? `0 0 0 2.5px white, 0 0 0 4.5px ${t.color}` : "none",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>

        {/* Dashboard frame — zoom scales layout+visual together; no squishing */}
        <style>{`@media(max-width:1279px){.sc-frame{zoom:0.78}}@media(min-width:1280px) and (max-width:1535px){.sc-frame{zoom:0.88}}`}</style>
        <div className="reveal-up relative sc-frame">

          {/* "Try me" pencil annotation */}
          <div className="absolute -top-9 right-6 flex items-center gap-1.5 pointer-events-none select-none z-10" aria-hidden>
            <span className="text-sm text-gray-400 italic" style={{ fontFamily: "cursive" }}>try me!</span>
            <svg width="44" height="34" viewBox="0 0 44 34" fill="none">
              <path d="M 4 6 C 8 4 28 4 38 20" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2.5"/>
              <path d="M 32 17 L 40 23 L 35 27" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

        <div
          className="rounded-3xl border border-black/[0.07] dark:border-white/[0.06] shadow-2xl overflow-hidden transition-colors duration-500 dark:bg-zinc-900"
          style={{ background: isDark ? undefined : theme.bg }}
        >
          {/* Chrome bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b gap-4 bg-white/60 dark:bg-zinc-900/80 border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-400/80"    />
                <div className="size-3 rounded-full bg-yellow-400/80" />
                <div className="size-3 rounded-full bg-green-400/80"  />
              </div>
              <span className="ml-1 text-xs text-gray-400 font-medium hidden sm:block">databubble.app/dashboard</span>
            </div>

            {/* AI text box + button */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              {(selMonth || selCat) && !aiRunning && (
                <button
                  onClick={() => { setSelMonth(null); setSelCat(null); setAiText("") }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  Clear
                </button>
              )}
              <div className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5 w-56 bg-white dark:bg-zinc-800 border-black/[0.08] dark:border-white/[0.1]">
                <span className="text-xs flex-1 truncate" style={{ color: aiText ? (isDark ? "#e2e8f0" : "#374151") : (isDark ? "#475569" : "#d1d5db") }}>
                  {aiText || "Ask DataBubble AI…"}
                </span>
                {aiRunning && (
                  <span className="w-0.5 h-3 rounded-full flex-shrink-0 animate-pulse" style={{ background: theme.color }} />
                )}
              </div>
              <button
                onClick={handleAiClick}
                disabled={aiRunning}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex-shrink-0 transition-opacity"
                style={{ background: theme.color, opacity: aiRunning ? 0.55 : 1 }}
              >
                <Sparkles className="size-3" />
                AI
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 flex flex-col gap-4">

            {/* Active filter chips */}
            {(selMonth || selCat) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs ${isDark ? "text-zinc-400" : "text-gray-400"}`}>Filtered by:</span>
                {selMonth && (
                  <button
                    onClick={() => setSelMonth(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: `${theme.color}18`, color: theme.color }}
                  >
                    {selMonth} <X className="size-3" />
                  </button>
                )}
                {selCat && (
                  <button
                    onClick={() => setSelCat(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: `${catColor(selCat)}22`, color: catColor(selCat) }}
                  >
                    {selCat} <X className="size-3" />
                  </button>
                )}
              </div>
            )}

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Revenue"   value={revenue}  format="currency" accent={theme.color} trendPct={kpiTrend.rev} trendLabel="Jun" />
              <KpiCard label="Orders"    value={orders}   format="integer"  accent={theme.color} trendPct={kpiTrend.ord} trendLabel="Jun" />
              <KpiCard label="Avg Order" value={avgOrder} format="currency" accent={theme.color} trendPct={kpiTrend.avg} trendLabel="Jun" />
              <KpiCard label="Channels"  value={selCat ? 1 : 3} format="integer" accent={theme.color} />
            </div>

            {/* Bar + Pie side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* Bar chart */}
              <div className="lg:col-span-3 rounded-2xl p-5 border shadow-sm bg-white dark:bg-zinc-800 border-black/[0.05] dark:border-white/[0.06]">
                <p className="text-sm font-semibold mb-3" style={{ color: titleClr }}>Monthly Revenue</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: axisClr }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisClr }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={38} />
                    <Tooltip
                      cursor={false}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.18)", fontSize: 12, background: isDark ? "#27272a" : "#fff", color: isDark ? "#e2e8f0" : "#111" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [`$${Number(v).toLocaleString()}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" radius={[5, 5, 0, 0]} isAnimationActive={false}>
                      {barData.map((entry) => (
                        <Cell
                          key={entry.month}
                          fill={theme.color}
                          fillOpacity={selMonth ? (entry.month === selMonth ? 1 : 0.15) : 0.82}
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelMonth(prev => prev === entry.month ? null : entry.month)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart */}
              <div className="lg:col-span-2 rounded-2xl p-5 border shadow-sm flex flex-col bg-white dark:bg-zinc-800 border-black/[0.05] dark:border-white/[0.06]">
                <p className="text-sm font-semibold mb-2" style={{ color: titleClr }}>Revenue by Channel</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%"
                      innerRadius={52} outerRadius={78}
                      dataKey="value" isAnimationActive={false}
                      stroke="none"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(entry: any) => setSelCat(prev => prev === entry.name ? null : entry.name)}
                    >
                      {pieData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={theme.pieColors[i] ?? theme.color}
                          fillOpacity={selCat ? (entry.name === selCat ? 1 : 0.25) : 0.9}
                          style={{ cursor: "pointer" }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.18)", fontSize: 12, background: isDark ? "#27272a" : "#fff", color: isDark ? "#e2e8f0" : "#111" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [`$${Number(v).toLocaleString()}`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 mt-auto pt-1">
                  {pieData.map((entry, i) => (
                    <button
                      key={entry.name}
                      onClick={() => setSelCat(prev => prev === entry.name ? null : entry.name)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full flex-shrink-0" style={{ background: theme.pieColors[i] ?? theme.color, opacity: selCat && selCat !== entry.name ? 0.25 : 1 }} />
                        <span className="text-xs font-medium" style={{ color: isDark ? "#a1a1aa" : "#6b7280", opacity: selCat && selCat !== entry.name ? 0.4 : 1 }}>{entry.name}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: titleClr }}>{fmtCurrency(entry.value)}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Area chart — full width */}
            <div className="rounded-2xl p-5 border shadow-sm bg-white dark:bg-zinc-800 border-black/[0.05] dark:border-white/[0.06]">
              <p className="text-sm font-semibold mb-3" style={{ color: titleClr }}>Order Volume Trend</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart key={`${selMonth ?? "all"}-${selCat ?? "all"}`} data={trendData}>
                  <defs>
                    <linearGradient id="sc-area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={theme.color} stopOpacity={isDark ? 0.4 : 0.25} />
                      <stop offset="95%" stopColor={theme.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridClr} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: axisClr }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: axisClr }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.18)", fontSize: 12, background: isDark ? "#27272a" : "#fff", color: isDark ? "#e2e8f0" : "#111" }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [Number(v), "Orders"]}
                  />
                  <Area type="monotone" dataKey="orders" stroke={theme.color} strokeWidth={2} fill="url(#sc-area-grad)" animationDuration={700} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
        </div>{/* end relative wrapper */}

      </div>
    </div>
  )
}

// ─── FaqRow ───────────────────────────────────────────────────────────────────

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button className="w-full flex items-center justify-between py-5 text-left gap-4" onClick={() => setOpen(!open)}>
        <span className="text-base font-medium">{q}</span>
        <ChevronDown className="size-4 text-muted-foreground flex-shrink-0 transition-transform duration-300" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>
      <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: open ? "200px" : "0" }}>
        <p className="pb-5 text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  )
}

// ─── AuthModal ────────────────────────────────────────────────────────────────

const GOOGLE_ICON = (
  <svg className="size-4 flex-shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

function AuthModal({ open, onClose, initialMode }: { open: boolean; onClose: () => void; initialMode: AuthMode }) {
  const [mode, setMode]         = useState<AuthMode>(initialMode)
  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [sent, setSent]         = useState(false)
  const [loading, setLoading]   = useState(false)

  useEffect(() => { setMode(initialMode) }, [initialMode])

  const reset      = () => { setName(""); setEmail(""); setPassword(""); setError(""); setSent(false) }
  const switchMode = (m: AuthMode) => { setMode(m); reset() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setLoading(true)
    const supabase = createClient()
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      if (error) { setError(error.message); setLoading(false); return }
      setSent(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError("Incorrect email or password."); setLoading(false); return }
      onClose()
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/` } })
  }

  const leftPanel = (
    <div
      className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden"
      style={{ background: "linear-gradient(145deg, #1d4ed8 0%, #3b82f6 55%, #60a5fa 100%)" }}
    >
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/[0.06]" />
      <span className="relative text-xl font-bold text-white tracking-tight">DataBubble</span>
      <div className="relative flex flex-col gap-5">
        {sent ? (
          <>
            <h2 className="text-2xl font-bold text-white leading-tight">Check your inbox.</h2>
            <p className="text-sm text-blue-100">We sent a confirmation link to <strong className="text-white">{email}</strong>.</p>
          </>
        ) : mode === "signup" ? (
          <>
            <h2 className="text-2xl font-bold text-white leading-tight">Join DataBubble.</h2>
            <ul className="flex flex-col gap-3">
              {["Free to get started", "AI-powered dashboards in seconds", "Share with anyone — no login to view"].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-blue-100">
                  <Check className="size-4 text-white mt-0.5 flex-shrink-0" />{item}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white leading-tight">Welcome back.</h2>
            <ul className="flex flex-col gap-3">
              {["Access your saved dashboards", "Share with your team", "Manage your account"].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-blue-100">
                  <Check className="size-4 text-white mt-0.5 flex-shrink-0" />{item}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <p className="relative text-xs text-blue-200">No credit card required</p>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset() } }}>
      <DialogContent className="p-0 overflow-hidden gap-0 border-0 shadow-2xl" style={{ maxWidth: "46rem" }}>
        <DialogTitle className="sr-only">{mode === "signin" ? "Sign in" : "Create account"}</DialogTitle>
        <div className="grid md:grid-cols-[2fr_3fr]">
          {leftPanel}

          <div className="flex flex-col gap-5 p-8 bg-white dark:bg-background">
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                  <Check className="size-6 text-blue-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">Check your email</p>
                  <p className="text-sm text-muted-foreground">Confirmation link sent to <span className="font-medium text-foreground">{email}</span></p>
                </div>
                <button className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors" onClick={() => switchMode("signin")}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-bold">{mode === "signin" ? "Sign in to DataBubble" : "Create your account"}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{mode === "signin" ? "Save and share your dashboards." : "Free to get started. No credit card needed."}</p>
                </div>

                <Button variant="outline" className="w-full flex items-center gap-2" onClick={handleGoogle} type="button">
                  {GOOGLE_ICON}
                  Continue with Google
                </Button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  {mode === "signup" && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="auth-name">Name</Label>
                      <Input id="auth-name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="auth-email">Email</Label>
                    <Input id="auth-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="auth-password">Password</Label>
                    <Input id="auth-password" type="password" placeholder={mode === "signup" ? "At least 6 characters" : "Your password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === "signup" ? 6 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button type="submit" className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-none" disabled={loading}>
                    {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground">
                  {mode === "signin"
                    ? <> No account?{" "}<button className="underline underline-offset-2 hover:text-foreground transition-colors" onClick={() => switchMode("signup")}>Sign up free</button></>
                    : <> Already have an account?{" "}<button className="underline underline-offset-2 hover:text-foreground transition-colors" onClick={() => switchMode("signin")}>Sign in</button></>
                  }
                </p>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── UserMenu ─────────────────────────────────────────────────────────────────

function UserMenu({ user, onSignOut }: { user: SupabaseUser; onSignOut: () => void }) {
  const name     = user.user_metadata?.full_name ?? user.email ?? "Account"
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <span className="size-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">{initials}</span>
          <span className="hidden sm:block text-sm">{name.split(" ")[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="size-3.5 mr-2" />Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const router  = useRouter()
  const isGBP   = useCurrency()
  const { resolvedTheme, setTheme } = useTheme()
  const [user, setUser]         = useState<SupabaseUser | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>("signin")
  const [dashOpen, setDashOpen] = useState(false)
  const [dashName, setDashName] = useState("")
  const [url, setUrl]           = useState("")
  const [notes, setNotes]       = useState("")
  const pageRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-item", { y: 30, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", delay: 0.1 })
      gsap.set(".reveal-up", { opacity: 0, y: 50 })
      ScrollTrigger.batch(".reveal-up", {
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: "power3.out" }),
        start: "top 88%",
      })
    }, pageRef)
    return () => ctx.revert()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  const openAuth   = (mode: AuthMode) => { setAuthMode(mode); setAuthOpen(true) }
  const isValidUrl = url.trim() !== "" && url.includes("docs.google.com/spreadsheets")

  const handleNavigate = (generate: boolean) => {
    if (!isValidUrl) return
    const params = new URLSearchParams()
    params.set("url", url.trim())
    if (dashName.trim()) params.set("name", dashName.trim())
    if (generate) params.set("generate", "true")
    if (notes.trim()) params.set("notes", notes.trim())
    router.push(`/dashboard?${params.toString()}`)
    setDashOpen(false)
  }

  return (
    <div ref={pageRef} className="relative min-h-screen flex flex-col bg-background">
      {/* Dot grid texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.022] dark:opacity-[0.035]"
        style={{ backgroundImage: "radial-gradient(circle, #1d4ed8 1.5px, transparent 1.5px)", backgroundSize: "30px 30px" }}
        aria-hidden
      />

      {/* ── Nav — standalone sticky so it persists through the whole page ── */}
      <nav className="sticky top-0 z-50 grid grid-cols-3 items-center px-10 py-6 bg-transparent pointer-events-none">
        <button
          className="text-3xl font-bold tracking-tight text-blue-500 hover:text-blue-400 transition-colors duration-150 text-left pointer-events-auto drop-shadow-md"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          DataBubble
        </button>

        <div className="hidden md:flex items-center justify-center pointer-events-auto">
          <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-full px-2 py-1.5 shadow-md">
            {NAV_ITEMS.map(({ label, href }) => (
              <button key={label} onClick={() => scrollTo(href)} className="text-sm font-medium text-muted-foreground hover:text-foreground px-3.5 py-1.5 rounded-full hover:bg-white dark:hover:bg-neutral-700 transition-all duration-150 whitespace-nowrap">
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pointer-events-auto [&>*]:drop-shadow-md">
          {user ? (
            <UserMenu user={user} onSignOut={handleSignOut} />
          ) : (
            <>
              <Button variant="ghost" className="text-sm" onClick={() => openAuth("signin")}>Sign in</Button>
              <Button className="rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-none text-sm px-5" onClick={() => openAuth("signup")}>Get started</Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </nav>

      {/* ── Hero — -mt pulls it up behind the nav; h-dvh = exactly one viewport tall ── */}
      <section className="relative -mt-[84px] h-dvh flex flex-col text-center">
        {/* Central glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div
            className="w-[700px] h-[380px] rounded-full opacity-70 dark:opacity-30"
            style={{ background: "radial-gradient(ellipse, rgba(96,165,250,0.35) 0%, rgba(59,130,246,0.08) 50%, transparent 70%)" }}
          />
        </div>
        {/* pt-24 clears the transparent nav; flex-1 fills remaining space above stats strip */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-6 gap-4">
          <div className="hero-item inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-1.5 bg-blue-50/80 dark:bg-blue-950/50 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
            Free to try · No account needed
          </div>
          <h1 className="hero-item text-5xl sm:text-6xl lg:text-7xl 2xl:text-8xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            Turn your spreadsheet
            <br />
            <span className="text-blue-500">into a dashboard.</span>
          </h1>
          <p className="hero-item text-muted-foreground text-xl max-w-sm leading-relaxed">
            Paste a Google Sheets link. Get a beautiful, shareable dashboard in seconds.
          </p>
          <div className="hero-item flex flex-wrap items-center justify-center gap-3">
            <Button
              className="h-12 px-7 text-base rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-[0_0_40px_rgba(59,130,246,0.45)] hover:shadow-[0_0_55px_rgba(59,130,246,0.55)] transition-shadow duration-300"
              onClick={() => setDashOpen(true)}
            >
              Create a dashboard →
            </Button>
          </div>
        </div>
        {/* Stats strip — last flex child, sits at bottom of section = bottom of viewport */}
        <StatsStrip />
      </section>

      {/* ── How it works + live showcase ─────────────────────────────────── */}
      <section id="how-it-works" className="py-16 px-6 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="reveal-up text-xs font-semibold uppercase tracking-widest text-blue-500 mb-3">How it works</p>
            <h2 className="reveal-up text-4xl sm:text-5xl font-bold tracking-tight">Three steps to your dashboard</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="reveal-up flex flex-col gap-4">
                <span className="text-6xl font-bold leading-none text-blue-200">{step}</span>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live interactive demo — the result of step 3 */}
        <DashboardShowcase />
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="reveal-up text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">Features</p>
            <h2 className="reveal-up text-4xl sm:text-5xl font-bold tracking-tight">Everything you need</h2>
            <p className="reveal-up text-muted-foreground text-lg mt-4 max-w-md mx-auto">No training required. If you can use a spreadsheet, you can use DataBubble.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="reveal-up flex flex-col gap-4 p-6 rounded-2xl border border-border hover:border-blue-200 hover:shadow-sm transition-all duration-200">
                <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                  <Icon className="size-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-base">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-6 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="reveal-up text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">Pricing</p>
            <h2 className="reveal-up text-4xl sm:text-5xl font-bold tracking-tight">Simple, honest pricing</h2>
            <p className="reveal-up text-muted-foreground text-lg mt-4">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5">
            {PRICING.map((plan) => (
              <div key={plan.name} className={`reveal-up relative flex flex-col gap-6 p-8 rounded-2xl border-2 bg-white dark:bg-neutral-900 transition-all duration-200 ${plan.highlighted ? "border-blue-500 shadow-lg shadow-blue-100 dark:shadow-blue-950" : "border-border"}`}>
                {plan.highlighted && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold bg-blue-500 text-white px-3 py-1 rounded-full">Most popular</span>}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
                  <div className="flex items-end gap-1 mt-1">
                    <span className="text-4xl font-bold">{isGBP ? plan.gbpPrice : plan.usdPrice}</span>
                    <span className="text-muted-foreground pb-1">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.desc}</p>
                </div>
                <ul className="flex flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className="size-4 text-blue-500 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Button className={`w-full rounded-full mt-auto ${plan.highlighted ? "bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-none" : ""}`} variant={plan.highlighted ? "default" : "outline"} onClick={() => openAuth("signup")}>
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ────────────────────────────────────────────────────────── */}
      <section id="about" className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-8">
          <p className="reveal-up text-xs font-semibold uppercase tracking-widest text-blue-500">About</p>
          <h2 className="reveal-up text-4xl sm:text-5xl font-bold tracking-tight">Built for the people who keep businesses running</h2>
          <p className="reveal-up text-muted-foreground text-lg leading-relaxed">
            DataBubble started because too many small business owners were stuck in spreadsheets, unable to make sense of their own data. Hiring a developer or buying enterprise software wasn't an option. Staring at rows and columns wasn't working either. We built something in between — fast, beautiful, and genuinely simple.
          </p>
          <div className="reveal-up flex flex-wrap items-center justify-center gap-4 mt-2">
            {[{ label: "Free to start", sub: "No credit card" }, { label: isGBP ? "From £7.99/mo" : "From $9.99/mo", sub: "Cancel anytime" }, { label: "Built in 2026", sub: "Always improving" }].map(({ label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-0.5 px-6 py-4 rounded-2xl border border-border">
                <span className="font-semibold text-base">{label}</span>
                <span className="text-xs text-muted-foreground">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-28 px-6 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <p className="reveal-up text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">FAQ</p>
            <h2 className="reveal-up text-4xl sm:text-5xl font-bold tracking-tight">Common questions</h2>
          </div>
          <div className="reveal-up divide-y divide-border rounded-2xl border border-border bg-white dark:bg-neutral-900 px-6">
            {FAQ.map(({ q, a }) => <FaqRow key={q} q={q} a={a} />)}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border px-10 py-16 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
            <div className="flex flex-col gap-3 max-w-xs">
              <span className="text-blue-500 text-xl font-bold tracking-tight">DataBubble</span>
              <p className="text-sm text-muted-foreground leading-relaxed">Turn any Google Sheet into a beautiful, shareable dashboard in seconds.</p>
            </div>
            <div className="flex flex-wrap gap-12">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Product</p>
                {["Features", "How it works", "Pricing", "Demo"].map((item) => (
                  <button key={item} onClick={() => item === "Demo" ? router.push("/dashboard?demo=true") : scrollTo(`#${item.toLowerCase().replace(/ /g, "-")}`)} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">{item}</button>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Company</p>
                {["About", "FAQ", "Contact"].map((item) => (
                  <button key={item} onClick={() => scrollTo(`#${item.toLowerCase()}`)} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">{item}</button>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Legal</p>
                {["Privacy policy", "Terms of service"].map((item) => (
                  <span key={item} className="text-sm text-muted-foreground">{item}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© 2026 DataBubble. All rights reserved.</p>
            <Button className="rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-none text-sm" onClick={() => openAuth("signup")}>Get started free →</Button>
          </div>
        </div>
      </footer>

      {/* ── Dashboard creation dialog ──────────────────────────────────── */}
      <Dialog open={dashOpen} onOpenChange={setDashOpen}>
        <DialogContent className="p-0 overflow-hidden gap-0 border-0 shadow-2xl" style={{ maxWidth: "62rem" }}>
          <DialogTitle className="sr-only">Create a dashboard</DialogTitle>
          <div className="grid md:grid-cols-[2fr_3fr]">

            {/* Left: blue brand panel */}
            <div
              className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden"
              style={{ background: "linear-gradient(145deg, #1d4ed8 0%, #3b82f6 55%, #60a5fa 100%)" }}
            >
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/[0.06]" />

              <div className="relative">
                <span className="text-xl font-bold text-white tracking-tight">DataBubble</span>
              </div>

              <div className="relative flex flex-col gap-6">
                <h2 className="text-3xl font-bold text-white leading-tight">
                  Your dashboard<br />is 30 seconds<br />away.
                </h2>
                <ul className="flex flex-col gap-3">
                  {[
                    "AI picks the right charts automatically",
                    "Drag, resize and customise freely",
                    "Share with one link — no login needed to view",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-blue-100">
                      <Check className="size-4 text-white mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="relative text-xs text-blue-200">No credit card required</p>
            </div>

            {/* Right: form panel */}
            <div className="flex flex-col gap-6 p-8 bg-white dark:bg-background">
              <div>
                <h3 className="text-xl font-bold">Create a dashboard</h3>
                <p className="text-sm text-muted-foreground mt-1">Paste your Google Sheets link to get started.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dash-name">
                    Dashboard name{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="dash-name"
                    placeholder="e.g. Q3 Sales Report"
                    value={dashName}
                    onChange={(e) => setDashName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dash-url">Google Sheets URL</Label>
                  <Input
                    id="dash-url"
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="font-mono text-xs"
                  />
                  {url && !isValidUrl
                    ? <p className="text-xs text-destructive">That doesn&apos;t look like a Google Sheets URL.</p>
                    : <p className="text-xs text-muted-foreground">Make sure sharing is set to &quot;Anyone with the link can view&quot;</p>
                  }
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dash-notes">
                    Notes for AI{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <textarea
                    id="dash-notes"
                    rows={3}
                    placeholder="e.g. Only use data from July. Ignore the 'Returns' column. Focus on Online sales."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">Tell the AI what to focus on or leave out — it reads this before building your dashboard.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() => handleNavigate(true)}
                  disabled={!isValidUrl}
                  className="w-full h-11 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-none font-semibold"
                >
                  Generate with AI →
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => handleNavigate(false)}
                  disabled={!isValidUrl}
                >
                  Start with a blank canvas
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setDashOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* ── Auth modal ───────────────────────────────────────────────────── */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </div>
  )
}
