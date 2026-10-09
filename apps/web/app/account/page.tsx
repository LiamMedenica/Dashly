"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, AlertTriangle, Shield, Zap } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Dialog, DialogContent, DialogTitle } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { deleteAccount } from "./actions"

const AVATAR_COLORS = [
  { key: "blue",   bg: "bg-blue-500",    ring: "ring-blue-500" },
  { key: "violet", bg: "bg-violet-600",  ring: "ring-violet-500" },
  { key: "indigo", bg: "bg-indigo-600",  ring: "ring-indigo-500" },
  { key: "rose",   bg: "bg-rose-500",    ring: "ring-rose-500" },
  { key: "teal",   bg: "bg-teal-600",    ring: "ring-teal-500" },
  { key: "orange", bg: "bg-orange-500",  ring: "ring-orange-500" },
]

const PLAN_LIMITS  = { free: 5,  starter: 50,      pro: 200 } as const
const PLAN_LABELS  = { free: "Free", starter: "Starter", pro: "Pro" } as const
const PLAN_STYLES  = {
  free:    "bg-muted text-muted-foreground",
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  pro:     "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser]               = useState<SupabaseUser | null>(null)
  const [profile, setProfile]         = useState<{ plan: string; ai_generations_used: number } | null>(null)
  const [name, setName]               = useState("")
  const [savedName, setSavedName]     = useState("")
  const [avatarColor, setAvatarColor] = useState("blue")
  const [savingName, setSavingName]   = useState(false)
  const [deleteOpen, setDeleteOpen]   = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting]       = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user
      if (!user) { router.push("/"); return }
      setUser(user)
      const fullName = user.user_metadata?.full_name ?? ""
      setName(fullName)
      setSavedName(fullName)
      setAvatarColor(user.user_metadata?.avatar_color ?? "blue")

      const { data } = await supabase
        .from("profiles")
        .select("plan, ai_generations_used")
        .eq("id", user.id)
        .single()
      if (data) setProfile(data)
    })
  }, [router])

  const saveName = async () => {
    if (!user || !name.trim() || name.trim() === savedName) return
    setSavingName(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } })
    setSavingName(false)
    if (error) { toast.error("Failed to update name"); return }
    setSavedName(name.trim())
    toast.success("Name updated")
  }

  const saveColor = async (colorKey: string) => {
    if (!user) return
    setAvatarColor(colorKey)
    const supabase = createClient()
    await supabase.auth.updateUser({ data: { avatar_color: colorKey } })
    toast.success("Avatar updated")
  }

  const handleDelete = async () => {
    if (!user || deleteConfirm !== "DELETE") return
    setDeleting(true)
    const result = await deleteAccount(user.id)
    if (result?.error) {
      toast.error("Failed to delete account")
      setDeleting(false)
      return
    }
    await createClient().auth.signOut()
    router.push("/")
  }

  if (!user) return null

  const initial     = (user.user_metadata?.full_name ?? user.email ?? "?")[0].toUpperCase()
  const colorEntry  = AVATAR_COLORS.find(c => c.key === avatarColor) ?? AVATAR_COLORS[0]!
  const plan        = ((profile?.plan ?? "free") as keyof typeof PLAN_LIMITS)
  const used        = profile?.ai_generations_used ?? 0
  const limit       = PLAN_LIMITS[plan]
  const pct         = Math.min((used / limit) * 100, 100)
  const verified    = !!user.email_confirmed_at
  const provider    = user.app_metadata?.provider ?? "email"

  return (
    <div className="min-h-screen bg-background">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.022] dark:opacity-[0.035]"
        style={{ backgroundImage: "radial-gradient(circle, #1d4ed8 1.5px, transparent 1.5px)", backgroundSize: "30px 30px" }}
        aria-hidden
      />

      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-sm">
        <button
          className="text-xl font-bold tracking-tight text-blue-500 hover:text-blue-400 transition-colors"
          onClick={() => router.push("/")}
        >
          DataBubble
        </button>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-5 animate-in fade-in-0 slide-in-from-bottom-3 duration-300">

        {/* Profile card */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 px-6 py-8 flex flex-col items-center gap-3">
            <span className={`size-20 rounded-full ${colorEntry.bg} text-white text-3xl font-bold flex items-center justify-center shadow-lg transition-colors`}>
              {initial}
            </span>
            {/* Color picker */}
            <div className="flex items-center gap-2 mt-1">
              {AVATAR_COLORS.map(({ key, bg, ring }) => (
                <button
                  key={key}
                  onClick={() => saveColor(key)}
                  className={`size-5 rounded-full ${bg} transition-all hover:scale-110 ${avatarColor === key ? `ring-2 ring-offset-2 ring-offset-blue-500 ${ring} scale-110` : "opacity-70 hover:opacity-100"}`}
                />
              ))}
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{user.user_metadata?.full_name || user.email}</p>
              <p className="text-blue-100 text-sm">{user.email}</p>
            </div>
            <span className={`px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide bg-white/20 text-white`}>
              {PLAN_LABELS[plan]}
            </span>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  placeholder="Your name"
                  className="flex-1"
                />
                <Button
                  onClick={saveName}
                  disabled={savingName || !name.trim() || name.trim() === savedName}
                  className="bg-blue-500 hover:bg-blue-600 text-white border-0"
                >
                  {savingName ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>

            <div className="flex justify-between text-sm py-2 border-t">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">
                {new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Signed in with</span>
              <span className="font-medium capitalize">{provider}</span>
            </div>
          </div>
        </div>

        {/* AI Usage */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-blue-500" />
            <h2 className="font-semibold">AI Usage</h2>
            <span className="ml-auto text-xs text-muted-foreground">Resets monthly</span>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Dashboard generations</span>
              <span className="font-medium tabular-nums">{used} / {limit}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${pct > 80 ? "bg-rose-500" : "bg-blue-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          {plan === "free" && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Upgrade for 50 generations/month on Starter, or 200 on Pro.
              </p>
              <Button
                onClick={() => { sessionStorage.setItem("scrollTarget", "pricing"); router.push("/") }}
                className="shrink-0 bg-blue-500 hover:bg-blue-600 text-white border-0 text-xs px-3 py-1.5 h-auto rounded-full"
              >
                Upgrade
              </Button>
            </div>
          )}
        </div>

        {/* Security */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-blue-500" />
            <h2 className="font-semibold">Security</h2>
          </div>

          <div className="divide-y">
            <div className="flex items-center justify-between py-3 first:pt-0">
              <div>
                <p className="text-sm font-medium">Email address</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              </div>
              {verified ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="size-3.5" /> Verified
                </span>
              ) : (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Unverified</span>
              )}
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground mt-0.5">Authenticator app (TOTP)</p>
              </div>
              <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">Coming soon</span>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-destructive/30 bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="size-4 text-destructive" />
            <h2 className="font-semibold text-destructive">Danger zone</h2>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground mt-0.5">Permanently removes your account and all dashboards</p>
            </div>
            <button
              onClick={() => setDeleteOpen(true)}
              className="shrink-0 text-sm px-4 py-2 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { if (!v) { setDeleteOpen(false); setDeleteConfirm("") } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-4" /> Are you absolutely sure?
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            This action is <strong className="text-foreground">permanent and cannot be undone</strong>. Deleting your account will immediately:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 pl-1 mt-1">
            <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">✕</span> Delete your account and profile</li>
            <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">✕</span> Permanently remove all your saved dashboards</li>
            <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">✕</span> Deactivate all shared dashboard links</li>
            <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">✕</span> Cancel your subscription immediately</li>
          </ul>
          <div className="space-y-1.5 mt-1">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <div className="flex gap-2 mt-1">
            <Button variant="outline" className="flex-1" onClick={() => { setDeleteOpen(false); setDeleteConfirm("") }}>
              Cancel
            </Button>
            <Button
              disabled={deleteConfirm !== "DELETE" || deleting}
              onClick={handleDelete}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white border-0"
            >
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
