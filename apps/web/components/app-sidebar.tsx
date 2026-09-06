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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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
  CommandIcon,
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
} from "lucide-react"
import { type ColumnInfo } from "@/lib/analyze"
import {
  Area, AreaChart,
  Bar, BarChart,
  Line, LineChart,
  Pie, PieChart, Cell,
} from "recharts"

const PREVIEW_DATA = [
  { v: 28 }, { v: 45 }, { v: 32 }, { v: 58 }, { v: 40 }, { v: 62 }, { v: 50 },
]
const PIE_DATA = [{ v: 40 }, { v: 28 }, { v: 20 }, { v: 12 }]
const PIE_OPACITIES = [1, 0.65, 0.4, 0.2]

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

function ChartPreview({ title }: { title: string }) {
  if (title === "Bar Chart") return (
    <div className="text-primary">
      <BarChart width={152} height={56} data={PREVIEW_DATA} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <Bar dataKey="v" fill="currentColor" radius={2} animationDuration={900} />
      </BarChart>
    </div>
  )

  if (title === "Area Chart") return (
    <div className="text-primary">
      <AreaChart width={152} height={56} data={PREVIEW_DATA} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <Area type="monotone" dataKey="v" stroke="currentColor" fill="currentColor" fillOpacity={0.15} strokeWidth={2} dot={false} animationDuration={900} />
      </AreaChart>
    </div>
  )

  if (title === "Pie Chart") return (
    <div className="text-primary">
      <PieChart width={152} height={56}>
        <Pie data={PIE_DATA} dataKey="v" cx={76} cy={28} outerRadius={24} animationBegin={0} animationDuration={900}>
          {PIE_DATA.map((_, i) => <Cell key={i} fill="currentColor" fillOpacity={PIE_OPACITIES[i]} />)}
        </Pie>
      </PieChart>
    </div>
  )

  if (title === "Stat Card") return <AnimatedStat />

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

  return (
    <div className="text-primary">
      <LineChart width={152} height={56} data={PREVIEW_DATA} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={2} dot={false} animationDuration={900} />
      </LineChart>
    </div>
  )
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
    icon: <BarChart3Icon className="size-3.5 shrink-0" />,
    description: "Compare values across categories side by side.",
    onDrag: () => window.dispatchEvent(new CustomEvent("sidebar-drag-chart", { detail: { type: "bar" } })),
  },
  {
    title: "Line Chart",
    icon: <LineChartIcon className="size-3.5 shrink-0" />,
    description: "Track how a value changes over time.",
    onDrag: () => window.dispatchEvent(new CustomEvent("sidebar-drag-chart", { detail: { type: "line" } })),
  },
  {
    title: "Area Chart",
    icon: <AreaChartIcon className="size-3.5 shrink-0" />,
    description: "Like a line chart but with the area beneath filled in.",
    onDrag: () => window.dispatchEvent(new CustomEvent("sidebar-drag-chart", { detail: { type: "area" } })),
  },
  {
    title: "Pie Chart",
    icon: <PieChartIcon className="size-3.5 shrink-0" />,
    description: "Show each category as a slice of the total.",
    onDrag: () => window.dispatchEvent(new CustomEvent("sidebar-drag-chart", { detail: { type: "pie" } })),
  },
  {
    title: "Stat Card",
    icon: <HashIcon className="size-3.5 shrink-0" />,
    description: "Highlight a single key number at a glance.",
    onDrag: () => window.dispatchEvent(new Event("sidebar-drag-stat")),
  },
  {
    title: "Table",
    icon: <TableIcon className="size-3.5 shrink-0" />,
    description: "Browse your raw data in a structured grid.",
    onDrag: () => window.dispatchEvent(new Event("sidebar-drag-table")),
  },
]

const NAV_SECONDARY = [
  { title: "Settings", url: "#", icon: <Settings2Icon /> },
  { title: "Get Help",  url: "#", icon: <CircleHelpIcon /> },
]

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
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">Dashly</span>
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
              <SidebarGroupLabel>{dashboardName}</SidebarGroupLabel>
              <SidebarMenu>
                <Collapsible defaultOpen className="group/collapsible" render={<SidebarMenuItem />}>
                  <CollapsibleTrigger render={<SidebarMenuButton />}>
                    <BarChart3Icon />
                    <span>Charts</span>
                    <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {CHART_TYPES.map(ct => (
                        <HoverCard key={ct.title}>
                          <SidebarMenuSubItem>
                            <HoverCardTrigger
                              render={
                                <div
                                  onMouseDown={e => {
                                    if (e.button !== 0) return
                                    e.preventDefault()
                                    ct.onDrag()
                                  }}
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                  style={{ cursor: "grab" }}
                                />
                              }
                            >
                              {ct.icon}
                              <span>{ct.title}</span>
                            </HoverCardTrigger>
                            <HoverCardContent side="right" sideOffset={12} className="w-44">
                              <ChartPreview title={ct.title} />
                              <p className="font-medium text-xs mt-2 mb-0.5">{ct.title}</p>
                              <p className="text-xs text-muted-foreground leading-snug">{ct.description}</p>
                            </HoverCardContent>
                          </SidebarMenuSubItem>
                        </HoverCard>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>

                {columns.length > 0 && (
                  <Collapsible className="group/collapsible" render={<SidebarMenuItem />}>
                    <CollapsibleTrigger render={<SidebarMenuButton />}>
                      <DatabaseIcon />
                      <span>Data</span>
                      <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
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
                    </CollapsibleContent>
                  </Collapsible>
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
