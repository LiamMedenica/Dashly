"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, LogOut, User } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

function isGoogleSheetsUrl(url: string): boolean {
  return url.includes("docs.google.com/spreadsheets")
}

type AuthMode = "signin" | "signup"

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function AuthModal({ open, onClose, initialMode }: { open: boolean; onClose: () => void; initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => { setMode(initialMode) }, [initialMode])

  const reset = () => { setName(""); setEmail(""); setPassword(""); setError(""); setMessage("") }
  const switchMode = (m: AuthMode) => { setMode(m); reset() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setMessage("")
    setLoading(true)
    const supabase = createClient()

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (error) { setError(error.message); setLoading(false); return }
      setMessage("Check your email for a confirmation link.")
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError("Incorrect email or password."); setLoading(false); return }
      onClose()
    }

    setLoading(false)
  }

  const handleGoogle = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    })
  }

  if (message) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset() } }}>
        <DialogContent className="sm:max-w-sm">
          <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
            <span className="text-2xl font-bold tracking-tight">DataBubble</span>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">We sent a confirmation link to <span className="font-medium text-foreground">{email}</span></p>
            </div>
            <button className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors" onClick={() => switchMode("signin")}>
              Back to sign in
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset() } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "signin" ? "Welcome back" : "Create your account"}</DialogTitle>
          <DialogDescription>
            {mode === "signin" ? "Sign in to save and share your dashboards." : "Free to get started. No credit card needed."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Button variant="outline" className="w-full flex items-center gap-2" onClick={handleGoogle} type="button">
            <GoogleIcon />
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
                <Input id="auth-name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-email">Email</Label>
              <Input id="auth-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                id="auth-password"
                type="password"
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 6 : 1}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
            {message && <p className="text-xs text-green-600 dark:text-green-400">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>No account?{" "}<button className="underline underline-offset-2 hover:text-foreground transition-colors" onClick={() => switchMode("signup")}>Sign up</button></>
            ) : (
              <>Already have an account?{" "}<button className="underline underline-offset-2 hover:text-foreground transition-colors" onClick={() => switchMode("signin")}>Sign in</button></>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UserMenu({ user, onSignOut }: { user: SupabaseUser; onSignOut: () => void }) {
  const name = user.user_metadata?.full_name ?? user.email ?? "Account"
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <span className="size-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
            {initials}
          </span>
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
          <LogOut className="size-3.5 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function Page() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>("signin")
  const [dashOpen, setDashOpen] = useState(false)
  const [dashName, setDashName] = useState("")
  const [url, setUrl] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  const openAuth = (mode: AuthMode) => { setAuthMode(mode); setAuthOpen(true) }

  const isValid = url.trim() !== "" && isGoogleSheetsUrl(url)

  const navigate = (generate: boolean) => {
    if (!isValid) return
    const params = new URLSearchParams()
    params.set("url", url.trim())
    if (dashName.trim()) params.set("name", dashName.trim())
    if (generate) params.set("generate", "true")
    router.push(`/dashboard?${params.toString()}`)
    setDashOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="font-semibold text-base tracking-tight">DataBubble</span>
        <div className="flex items-center gap-1">
          {user ? (
            <UserMenu user={user} onSignOut={handleSignOut} />
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => openAuth("signin")}>Sign in</Button>
              <Button size="sm" onClick={() => openAuth("signup")}>Sign up</Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-6">
        <div className="inline-flex items-center text-xs font-medium text-muted-foreground border border-border rounded-full px-3 py-1">
          Free to try · No account needed
        </div>

        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight max-w-2xl leading-[1.1]">
          Turn your Google Sheet into a dashboard
        </h1>

        <p className="text-muted-foreground text-lg max-w-sm">
          Paste a link. Get a beautiful, shareable dashboard in seconds.
        </p>

        <div className="flex items-center gap-3">
          <Button className="h-11 px-6 text-base" onClick={() => setDashOpen(true)}>
            Create a dashboard →
          </Button>
          <Button variant="outline" className="h-11 px-6 text-base" onClick={() => router.push("/dashboard?demo=true")}>
            See a demo
          </Button>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        © 2026 DataBubble
      </footer>

      <Dialog open={dashOpen} onOpenChange={setDashOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a dashboard</DialogTitle>
            <DialogDescription>Paste your Google Sheets link to get started. No account needed.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dash-name">Dashboard name</Label>
              <Input id="dash-name" placeholder="e.g. Q3 Sales Report" value={dashName} onChange={(e) => setDashName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">Google Sheets URL</Label>
              <Input id="url" type="url" placeholder="https://docs.google.com/spreadsheets/..." value={url} onChange={(e) => setUrl(e.target.value)} />
              {url && !isGoogleSheetsUrl(url) ? (
                <p className="text-xs text-destructive">That doesn't look like a Google Sheets URL.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Make sure sharing is set to "Anyone with the link can view"</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="ghost" className="sm:mr-auto" onClick={() => navigate(false)} disabled={!isValid}>Start blank</Button>
            <Button variant="outline" onClick={() => setDashOpen(false)}>Cancel</Button>
            <Button onClick={() => navigate(true)} disabled={!isValid}>Generate dashboard →</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </div>
  )
}
