"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { LayoutGrid, User, CreditCard, LogOut, Sun, Moon } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { createClient } from "@/utils/supabase/client"

const AVATAR_COLOR_HEX: Record<string, string> = {
  blue: "#3b82f6", violet: "#7c3aed", indigo: "#4338ca",
  rose: "#e11d48", teal: "#0d9488", orange: "#ea580c",
}

export function UserMenu({ user }: { user: SupabaseUser }) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const name     = user.user_metadata?.full_name ?? user.email ?? "Account"
  const initial  = (name[0] ?? "?").toUpperCase()
  const avatarBg = AVATAR_COLOR_HEX[user.user_metadata?.avatar_color ?? "blue"] ?? "#3b82f6"
  const isDark   = resolvedTheme === "dark"

  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current) }
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 150) }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="flex items-center gap-2 cursor-pointer rounded-full px-2 py-1.5 hover:bg-accent select-none outline-none"
        onMouseEnter={() => { cancelClose(); setOpen(true) }}
        onMouseLeave={scheduleClose}
      >
        <span className="size-8 rounded-full text-white text-sm font-semibold flex items-center justify-center shrink-0" style={{ backgroundColor: avatarBg }}>{initial}</span>
        <span className="hidden sm:block text-sm font-medium">{name.split(" ")[0]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 p-0 overflow-hidden rounded-2xl shadow-xl shadow-black/10 ring-1 ring-border/40"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        {/* Identity header */}
        <div className="flex flex-col items-center gap-2 px-4 py-4">
          <span className="size-10 rounded-full text-white text-base font-semibold flex items-center justify-center shrink-0" style={{ backgroundColor: avatarBg }}>{initial}</span>
          <div className="text-center min-w-0 w-full">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>

        <div className="px-2 pb-2">
          <DropdownMenuItem onClick={() => router.push("/dashboards")} className="cursor-pointer gap-2.5 px-3 py-2 rounded-xl">
            <LayoutGrid className="size-4 text-muted-foreground" />
            <span>My Dashboards</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/account")} className="cursor-pointer gap-2.5 px-3 py-2 rounded-xl">
            <User className="size-4 text-muted-foreground" />
            <span>Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/billing")} className="cursor-pointer gap-2.5 px-3 py-2 rounded-xl">
            <CreditCard className="size-4 text-muted-foreground" />
            <span>Billing</span>
          </DropdownMenuItem>

          {/* Theme row */}
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark
              ? <Moon className="size-4 text-muted-foreground" />
              : <Sun className="size-4 text-muted-foreground" />
            }
            <span className="text-sm flex-1">Appearance</span>
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${isDark ? "bg-blue-500" : "bg-muted-foreground/30"}`}>
              <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform duration-200 ${isDark ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </div>

          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer gap-2.5 px-3 py-2 rounded-xl text-destructive focus:text-destructive">
            <LogOut className="size-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
