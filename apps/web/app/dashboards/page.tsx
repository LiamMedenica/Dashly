"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Search, MoreVertical, ExternalLink,
  Link2, Pencil, Trash2, Lock, Globe, Check, Share2, KeyRound,
  BarChart2, TrendingUp, LayoutDashboard,
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog, DialogContent, DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { UserMenu } from "@/components/user-menu"
import { CreateDashboardDialog } from "@/components/create-dashboard-dialog"

// ─── Fake data ────────────────────────────────────────────────────────────────

const FAKE_DASHBOARDS = [
  {
    id: "1",
    name: "Monthly Sales Report",
    created: "12 Sep 2026",
    lastViewed: "2 days ago",
    shared: true,
    tiles: 8,
    chartType: "bar" as const,
    data: [38, 52, 44, 71, 60, 83, 67, 94],
    months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
  },
  {
    id: "2",
    name: "Marketing Campaign Q3",
    created: "18 Sep 2026",
    lastViewed: "5 days ago",
    shared: false,
    tiles: 5,
    chartType: "line" as const,
    data: [30, 45, 38, 60, 52, 70, 65, 78, 72, 88],
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
  },
  {
    id: "3",
    name: "The Crumb — Bakery KPIs",
    created: "24 Sep 2026",
    lastViewed: "Today",
    shared: true,
    tiles: 11,
    chartType: "area" as const,
    data: [22, 30, 38, 33, 44, 50, 46, 58, 65, 60, 72, 78],
    months: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
  },
]

type Dashboard = typeof FAKE_DASHBOARDS[number]

// ─── Mini chart preview ───────────────────────────────────────────────────────

function DashboardPreview({ dash }: { dash: Dashboard }) {
  const { chartType, data, months, id } = dash
  const W = 320
  const H = 96
  const max = Math.max(...data)
  const padL = 26
  const padB = 16
  const padR = 8
  const padT = 6
  const chartW = W - padL - padR
  const chartH = H - padB - padT

  const gridLevels = [0.33, 0.66, 1]

  if (chartType === "bar") {
    const n = data.length
    const gap = 3
    const bw = (chartW - gap * (n - 1)) / n
    return (
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {gridLevels.map((pct, i) => {
          const y = padT + chartH - pct * chartH
          return (
            <g key={i}>
              <text x={padL - 5} y={y + 3} textAnchor="end" fontSize={7} fill="currentColor" fillOpacity={0.35} fontFamily="monospace">
                {Math.round(pct * max)}
              </text>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="3 2" />
            </g>
          )
        })}
        {data.map((v, i) => {
          const bh = (v / max) * chartH
          const x = padL + i * (bw + gap)
          return (
            <rect key={i} x={x} y={padT + chartH - bh} width={bw} height={bh} rx={2} fill="#3b82f6" fillOpacity={0.8} />
          )
        })}
        {months.filter((_, i) => i % 2 === 0).map((m, idx) => {
          const i = idx * 2
          const x = padL + i * (bw + gap) + bw / 2
          return (
            <text key={m} x={x} y={H - 2} textAnchor="middle" fontSize={6.5} fill="currentColor" fillOpacity={0.35} fontFamily="sans-serif">{m}</text>
          )
        })}
      </svg>
    )
  }

  const pts: [number, number][] = data.map((v, i) => [
    padL + (i / (data.length - 1)) * chartW,
    padT + chartH - (v / max) * chartH,
  ])
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)} ${(padT + chartH).toFixed(1)} L${padL} ${(padT + chartH).toFixed(1)} Z`

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`ag-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      {gridLevels.map((pct, i) => {
        const y = padT + chartH - pct * chartH
        return (
          <g key={i}>
            <text x={padL - 5} y={y + 3} textAnchor="end" fontSize={7} fill="currentColor" fillOpacity={0.35} fontFamily="monospace">
              {Math.round(pct * max)}
            </text>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="3 2" />
          </g>
        )
      })}
      {chartType === "area" && <path d={areaPath} fill={`url(#ag-${id})`} />}
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.75} fill="#3b82f6" />
      ))}
      {months.filter((_, i) => i % Math.ceil(months.length / 5) === 0).map((m, idx) => {
        const i = idx * Math.ceil(months.length / 5)
        const [x] = pts[Math.min(i, pts.length - 1)]
        return (
          <text key={m} x={x} y={H - 2} textAnchor="middle" fontSize={6.5} fill="currentColor" fillOpacity={0.35} fontFamily="sans-serif">{m}</text>
        )
      })}
    </svg>
  )
}

// ─── Share settings dialog ────────────────────────────────────────────────────

function ShareSettingsDialog({ dash, open, onClose }: {
  dash: Dashboard | null
  open: boolean
  onClose: () => void
}) {
  const [shared, setShared] = useState(dash?.shared ?? false)
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (dash) { setShared(dash.shared); setUsePassword(false); setPassword("") }
  }, [dash])

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://databubble.app/dashboard/${dash?.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!dash) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden rounded-2xl shadow-2xl border-0 gap-0" style={{ maxWidth: "22rem" }}>
        <DialogTitle className="sr-only">Share settings</DialogTitle>
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="font-semibold text-sm">Share settings</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{dash.name}</p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Public link</p>
              <p className="text-xs text-muted-foreground mt-0.5">Anyone with the link can view</p>
            </div>
            <button
              onClick={() => setShared(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${shared ? "bg-blue-500" : "bg-muted-foreground/30"}`}
            >
              <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform duration-200 ${shared ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
          {shared && (
            <>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground font-mono truncate">
                  databubble.app/dashboard/{dash.id}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                >
                  {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={usePassword} onChange={e => setUsePassword(e.target.checked)} className="accent-blue-500 size-3.5" />
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-muted-foreground" />
                    Password protect
                  </span>
                </label>
                {usePassword && (
                  <Input type="password" placeholder="Set a password…" value={password} onChange={e => setPassword(e.target.value)} className="h-9 text-sm" />
                )}
              </div>
            </>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border/50 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg">Cancel</Button>
          <Button size="sm" onClick={onClose} className="rounded-lg bg-blue-500 hover:bg-blue-600 text-white border-0">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardsPage() {
  const router = useRouter()
  const [user, setUser]       = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState("")

  const [createOpen, setCreateOpen] = useState(false)
  const [shareOpen, setShareOpen]   = useState(false)
  const [shareDash, setShareDash]   = useState<Dashboard | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return }
      setUser(session.user)
      setLoading(false)
    })
  }, [router])

  const handleNavigate = (generate: boolean, name: string, url: string, notes: string) => {
    const params = new URLSearchParams()
    params.set("url", url.trim())
    if (name.trim()) params.set("name", name.trim())
    if (generate) params.set("generate", "true")
    if (notes.trim()) params.set("notes", notes.trim())
    router.push(`/dashboard?${params.toString()}`)
  }

  const openCreate = () => setCreateOpen(true)
  const openShare  = (dash: Dashboard) => { setShareDash(dash); setShareOpen(true) }

  const filtered = FAKE_DASHBOARDS.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return null

  return (
    <div className="min-h-screen bg-background">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.022] dark:opacity-[0.035]"
        style={{ backgroundImage: "radial-gradient(circle, #1d4ed8 1.5px, transparent 1.5px)", backgroundSize: "30px 30px" }}
        aria-hidden
      />

      <nav className="sticky top-0 z-50 grid grid-cols-3 items-center px-10 py-6 bg-background/80 backdrop-blur-sm border-b border-border/40">
        <button
          className="text-3xl font-bold tracking-tight text-blue-500 hover:text-blue-400 transition-colors duration-150 text-left"
          onClick={() => router.push("/")}
        >
          DataBubble
        </button>
        <div />
        <div className="flex items-center justify-end">
          {user && <UserMenu user={user} />}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 animate-in fade-in-0 slide-in-from-bottom-3 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Dashboards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {FAKE_DASHBOARDS.length} of 1 saved &middot;{" "}
              <span
                className="text-blue-500 hover:underline cursor-pointer"
                onClick={() => { sessionStorage.setItem("scrollTarget", "pricing"); router.push("/") }}
              >
                upgrade for more
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 w-48 bg-transparent text-sm"
              />
            </div>
            <Button onClick={openCreate} className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-full px-5 h-9">
              <Plus className="size-4 mr-1" />
              New
            </Button>
          </div>
        </div>

        {/* Card grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-24 text-center text-sm text-muted-foreground">
            No dashboards match &ldquo;{search}&rdquo;
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(dash => (
              <div
                key={dash.id}
                className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800/60 transition-all duration-200"
                onClick={() => router.push(`/dashboard?id=${dash.id}`)}
              >
                {/* Chart preview area */}
                <div className="h-36 bg-muted/20 dark:bg-muted/10 px-3 pt-3 pb-1 relative overflow-hidden">
                  {/* Subtle top-left chart type label */}
                  <div className="absolute top-2.5 left-3 flex items-center gap-1 opacity-40">
                    {dash.chartType === "bar"
                      ? <BarChart2 className="size-3" />
                      : <TrendingUp className="size-3" />
                    }
                    <span className="text-[9px] font-medium uppercase tracking-wide">{dash.chartType}</span>
                  </div>
                  <div className="mt-4">
                    <DashboardPreview dash={dash} />
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{dash.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <LayoutDashboard className="size-3" />
                          {dash.tiles} tiles
                        </span>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="text-xs text-muted-foreground">{dash.lastViewed}</span>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          {dash.shared
                            ? <><Globe className="size-3 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">Shared</span></>
                            : <><Lock className="size-3" />Private</>
                          }
                        </span>
                      </div>
                    </div>

                    {/* 3-dot menu */}
                    <div onClick={e => e.stopPropagation()} className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center justify-center size-7 rounded-lg hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity outline-none mt-0.5">
                          <MoreVertical className="size-3.5 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5">
                          <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-1.5 text-sm" onClick={() => router.push(`/dashboard?id=${dash.id}`)}>
                            <ExternalLink className="size-3.5" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-1.5 text-sm" onClick={() => openShare(dash)}>
                            <Share2 className="size-3.5" /> Share settings
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-1.5 text-sm">
                            <Pencil className="size-3.5" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1" />
                          <DropdownMenuItem variant="destructive" className="gap-2 cursor-pointer rounded-lg py-1.5 text-sm">
                            <Trash2 className="size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* New dashboard card */}
            <div
              className="rounded-2xl border-2 border-dashed border-border/50 hover:border-blue-300 dark:hover:border-blue-700 bg-transparent hover:bg-blue-50/30 dark:hover:bg-blue-950/20 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[188px]"
              onClick={openCreate}
            >
              <div className="size-9 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                <Plus className="size-4 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">New dashboard</p>
            </div>
          </div>
        )}
      </div>

      <ShareSettingsDialog dash={shareDash} open={shareOpen} onClose={() => setShareOpen(false)} />

      <CreateDashboardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  )
}
