"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@workspace/ui/components/sidebar"
import {
  AreaChartIcon,
  BarChart3Icon,
  CalendarIcon,
  ChevronRightIcon,
  DatabaseIcon,
  HashIcon,
  HomeIcon,
  LayoutDashboardIcon,
  LineChartIcon,
  PieChartIcon,
  PlusIcon,
  Settings2Icon,
  CircleHelpIcon,
  TableIcon,
  TypeIcon,
  ActivityIcon,
  TrendingUpIcon,
  GripVertical,
} from "lucide-react"
import { type ColumnInfo } from "@/lib/analyze"
import {
  Pie, PieChart, Cell,
  ComposedChart, Bar, Line,
} from "recharts"

const VALS    = [28, 45, 32, 58, 40, 62, 50]
const PIE_DATA = [{ v: 40 }, { v: 28 }, { v: 20 }, { v: 12 }]
const PIE_OPACITIES = [1, 0.65, 0.4, 0.2]
const SCATTER_PTS = [
  { x: 12, y: 34 }, { x: 28, y: 52 }, { x: 45, y: 38 }, { x: 18, y: 61 }, { x: 55, y: 44 },
  { x: 30, y: 28 }, { x: 62, y: 70 }, { x: 8,  y: 20 }, { x: 40, y: 55 }, { x: 50, y: 48 },
]
const COMBO_DATA = VALS.map(v => ({ v }))

function AnimatedStat() {
  const target = 2451
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    const duration = 1200
    const start = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-14 gap-0.5">
      <span className="text-xl font-bold text-foreground">{count.toLocaleString()}</span>
      <span className="text-[10px] text-muted-foreground">↑ 12% this month</span>
    </div>
  )
}

// ── chart data helpers ──────────────────────────────────────────────────────
const W = 152, H = 48, PAD = 4
const MAX_V = 62
function vPts() {
  return VALS.map((v, i) => ({
    x: (i / (VALS.length - 1)) * W,
    y: PAD + (1 - v / MAX_V) * H,
  }))
}
function linePath(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
}

function ChartPreview({ title, animKey = 0 }: { title: string; animKey?: number }) {
  const blue = "#3b82f6"

  // ── Bar Chart ─────────────────────────────────────────────────────────────
  if (title === "Bar Chart") {
    const barW = 15, gap = (W - VALS.length * barW) / (VALS.length + 1)
    return (
      <svg key={animKey} width={W} height={H + PAD * 2} style={{ overflow: "visible" }}>
        {VALS.map((v, i) => {
          const bh = Math.round((v / MAX_V) * H)
          return (
            <rect
              key={i}
              x={gap + i * (barW + gap)} y={H + PAD - bh}
              width={barW} height={bh}
              fill={blue} rx={3}
              className="sidebar-bar"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          )
        })}
      </svg>
    )
  }

  // ── Line Chart ────────────────────────────────────────────────────────────
  if (title === "Line Chart") {
    const pts = vPts()
    return (
      <svg key={animKey} width={W} height={H + PAD * 2}>
        <path
          d={linePath(pts)}
          fill="none" stroke={blue} strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round"
          className="sidebar-line-path" pathLength="1"
        />
      </svg>
    )
  }

  // ── Area Chart ────────────────────────────────────────────────────────────
  if (title === "Area Chart") {
    const pts = vPts()
    const lp  = linePath(pts)
    const ap  = `${lp} L ${W} ${H + PAD} L 0 ${H + PAD} Z`
    return (
      <svg key={animKey} width={W} height={H + PAD * 2}>
        <defs>
          <linearGradient id="sp-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={blue} stopOpacity={0.28} />
            <stop offset="100%" stopColor={blue} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={ap} fill="url(#sp-area)" className="sidebar-area-fill" />
        <path d={lp} fill="none" stroke={blue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="sidebar-line-path" pathLength="1" />
      </svg>
    )
  }

  // ── Pie Chart ─────────────────────────────────────────────────────────────
  if (title === "Pie Chart") return (
    <PieChart width={W} height={H + PAD * 2}>
      <Pie data={PIE_DATA} dataKey="v" cx={W / 2} cy={(H + PAD * 2) / 2} outerRadius={24} animationBegin={0} animationDuration={700}>
        {PIE_DATA.map((_, i) => <Cell key={i} fill={blue} fillOpacity={PIE_OPACITIES[i]} />)}
      </Pie>
    </PieChart>
  )

  // ── Scatter Chart ─────────────────────────────────────────────────────────
  if (title === "Scatter Chart") {
    const xMax = 70, yMax = 75
    return (
      <svg key={animKey} width={W} height={H + PAD * 2}>
        {SCATTER_PTS.map((p, i) => (
          <circle
            key={i}
            cx={(p.x / xMax) * (W - 16) + 8}
            cy={(H + PAD * 2) - (p.y / yMax) * (H) - 6}
            r={3.5} fill={blue} fillOpacity={0.75}
            className="sidebar-dot"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </svg>
    )
  }

  // ── Combo Chart ───────────────────────────────────────────────────────────
  if (title === "Combo Chart") {
    const barW = 15, gap = (W - VALS.length * barW) / (VALS.length + 1)
    const pts = VALS.map((v, i) => ({
      x: gap + i * (barW + gap) + barW / 2,
      y: PAD + (1 - v / MAX_V) * H,
    }))
    const lp = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
    return (
      <svg key={animKey} width={W} height={H + PAD * 2} style={{ overflow: "visible" }}>
        {VALS.map((v, i) => {
          const bh = Math.round((v / MAX_V) * H)
          return (
            <rect
              key={i}
              x={gap + i * (barW + gap)} y={H + PAD - bh}
              width={barW} height={bh}
              fill={blue} fillOpacity={0.35} rx={3}
              className="sidebar-bar"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          )
        })}
        <path d={lp} fill="none" stroke={blue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="sidebar-line-path" pathLength="1" style={{ animationDelay: "200ms" }} />
      </svg>
    )
  }

  // ── Stat Card ─────────────────────────────────────────────────────────────
  if (title === "Stat Card") return <AnimatedStat />

  // ── Table ─────────────────────────────────────────────────────────────────
  if (title === "Table") return (
    <div className="h-14 flex flex-col gap-px text-[9px] overflow-hidden mt-1">
      <div className="flex gap-2 px-1 py-0.5 bg-muted rounded font-medium text-muted-foreground">
        <span className="flex-1">Name</span><span>Value</span>
      </div>
      {[["Alpha", "1,204"], ["Beta", "983"], ["Gamma", "741"]].map(([n, v]) => (
        <div key={n} className="flex gap-2 px-1 py-0.5">
          <span className="flex-1">{n}</span><span className="text-muted-foreground">{v}</span>
        </div>
      ))}
    </div>
  )

  // ── Text Box ──────────────────────────────────────────────────────────────
  if (title === "Text Box") return (
    <div className="h-14 flex flex-col justify-center gap-1 overflow-hidden px-0.5">
      <p className="text-xs font-semibold leading-tight text-foreground">Dashboard Title</p>
      <p className="text-[9px] text-muted-foreground leading-snug">Add context, annotations, or section headers with rich text formatting.</p>
    </div>
  )

  return null
}

function ColTypeIcon({ type }: { type: ColumnInfo["type"] }) {
  const cls = "inline-flex size-3.5 shrink-0 items-center justify-center text-[10px] font-bold font-mono text-sidebar-foreground"
  if (type === "number" || type === "id") {
    return <span className={cls}>123</span>
  }
  if (type === "date") {
    return <CalendarIcon className="size-3.5 shrink-0" />
  }
  return <span className={cls}>Abc</span>
}

const CHART_TYPES = [
  {
    title: "Bar Chart",
    icon: BarChart3Icon,
    description: "Compare values across categories.",
    onDrag: () => window.dispatchEvent(new CustomEvent("sidebar-drag-chart", { detail: { type: "bar" } })),
  },
  {
    title: "Line Chart",
    icon: LineChartIcon,
    description: "Track how a value changes over time.",
    onDrag: () => window.dispatchEvent(new CustomEvent("sidebar-drag-chart", { detail: { type: "line" } })),
  },
  {
    title: "Area Chart",
    icon: AreaChartIcon,
    description: "Like a line chart with filled area.",
    onDrag: () => window.dispatchEvent(new CustomEvent("sidebar-drag-chart", { detail: { type: "area" } })),
  },
  {
    title: "Pie Chart",
    icon: PieChartIcon,
    description: "Show each category as a slice.",
    onDrag: () => window.dispatchEvent(new CustomEvent("sidebar-drag-chart", { detail: { type: "pie" } })),
  },
  {
    title: "Scatter Chart",
    icon: ActivityIcon,
    description: "Plot two numeric columns.",
    onDrag: () => window.dispatchEvent(new CustomEvent("sidebar-drag-chart", { detail: { type: "scatter" } })),
  },
  {
    title: "Combo Chart",
    icon: TrendingUpIcon,
    description: "Bars for volume with a trend line.",
    onDrag: () => window.dispatchEvent(new CustomEvent("sidebar-drag-chart", { detail: { type: "combo" } })),
  },
  {
    title: "Stat Card",
    icon: HashIcon,
    description: "Highlight a single key number.",
    onDrag: () => window.dispatchEvent(new Event("sidebar-drag-stat")),
  },
  {
    title: "Table",
    icon: TableIcon,
    description: "Browse raw data in a grid.",
    onDrag: () => window.dispatchEvent(new Event("sidebar-drag-table")),
  },
  {
    title: "Text Box",
    icon: TypeIcon,
    description: "Add headings or annotations.",
    onDrag: () => window.dispatchEvent(new Event("sidebar-drag-text")),
  },
]

const NAV_SECONDARY = [
  { title: "Settings", url: "#", icon: <Settings2Icon /> },
  { title: "Get Help",  url: "#", icon: <CircleHelpIcon /> },
]

function AnimatedSection({
  icon: Icon,
  label,
  defaultOpen = true,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="font-semibold"
        onClick={() => setOpen(o => !o)}
      >
        <Icon className="size-4" />
        <span>{label}</span>
        <ChevronRightIcon
          className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-250"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </SidebarMenuButton>
      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: "grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </SidebarMenuItem>
  )
}

function ChartTileItem({ ct }: { ct: typeof CHART_TYPES[number] }) {
  const [animKey, setAnimKey] = React.useState(0)
  const Icon = ct.icon

  return (
    <HoverCard>
      <SidebarMenuSubItem>
        <HoverCardTrigger
          render={
            <div
              onMouseDown={e => {
                if (e.button !== 0) return
                e.preventDefault()
                ct.onDrag()
              }}
              onMouseEnter={() => setAnimKey(k => k + 1)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              style={{ cursor: "grab" }}
            />
          }
        >
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span>{ct.title}</span>
          <GripVertical className="ml-auto size-3.5 shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
        </HoverCardTrigger>
        <HoverCardContent side="right" sideOffset={12} className="w-44">
          <ChartPreview title={ct.title} animKey={animKey} />
          <p className="font-semibold text-xs mt-2 mb-0.5">{ct.title}</p>
          <p className="text-xs text-muted-foreground leading-snug">{ct.description}</p>
        </HoverCardContent>
      </SidebarMenuSubItem>
    </HoverCard>
  )
}

export function AppSidebar({
  dashboardName,
  sheetUrl,
  columns = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  dashboardName?: string
  sheetUrl?: string
  columns?: ColumnInfo[]
}) {
  const params = new URLSearchParams()
  if (sheetUrl) params.set("url", sheetUrl)
  if (dashboardName && dashboardName !== "My Dashboard") params.set("name", dashboardName)
  const dashboardHref = `/dashboard${params.size ? `?${params}` : ""}`

  const navMain = [
    {
      title: "Home",
      url: "/",
      icon: <HomeIcon />,
    },
    {
      title: "Dashboards",
      url: "#",
      icon: <LayoutDashboardIcon />,
      items: [
        { title: dashboardName ?? "My Dashboard", url: dashboardHref },
        { title: "Create new", url: "/", icon: <PlusIcon className="size-3" />, className: "text-muted-foreground" },
      ],
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/" />}
            >
              <span className="text-base font-extrabold tracking-tight" style={{ color: "#3b82f6" }}>DataBubble</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />

        {dashboardName && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarMenu>
                <AnimatedSection icon={BarChart3Icon} label="Charts & Tiles" defaultOpen>
                  <SidebarMenuSub>
                    {CHART_TYPES.map(ct => (
                      <ChartTileItem key={ct.title} ct={ct} />
                    ))}
                  </SidebarMenuSub>
                </AnimatedSection>

                {columns.length > 0 && (
                  <AnimatedSection icon={DatabaseIcon} label="Data" defaultOpen={false}>
                    <SidebarMenuSub>
                      {columns.map(col => (
                        <SidebarMenuSubItem key={col.name}>
                          <SidebarMenuSubButton>
                            <ColTypeIcon type={col.type} />
                            <span className="truncate">{col.name}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </AnimatedSection>
                )}
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}

        <NavSecondary items={NAV_SECONDARY} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
