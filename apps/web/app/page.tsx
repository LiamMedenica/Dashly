"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

function isGoogleSheetsUrl(url: string): boolean {
  return url.includes("docs.google.com/spreadsheets")
}

export default function Page() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")

  const isValid = url.trim() !== "" && isGoogleSheetsUrl(url)

  const navigate = (generate: boolean) => {
    if (!isValid) return
    const params = new URLSearchParams()
    params.set("url", url.trim())
    if (name.trim()) params.set("name", name.trim())
    if (generate) params.set("generate", "true")
    router.push(`/dashboard?${params.toString()}`)
    setOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="font-semibold text-base tracking-tight">Dashly</span>
        <Button variant="ghost" size="sm">Sign in</Button>
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
          <Button className="h-11 px-6 text-base" onClick={() => setOpen(true)}>
            Create a dashboard →
          </Button>
          <Button
            variant="outline"
            className="h-11 px-6 text-base"
            onClick={() => router.push("/dashboard?demo=true")}
          >
            See a demo
          </Button>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        © 2026 Dashly
      </footer>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a dashboard</DialogTitle>
            <DialogDescription>
              Paste your Google Sheets link to get started. No account needed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Dashboard name</Label>
              <Input
                id="name"
                placeholder="e.g. Q3 Sales Report"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">Google Sheets URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              {url && !isGoogleSheetsUrl(url) ? (
                <p className="text-xs text-destructive">That doesn't look like a Google Sheets URL.</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Make sure sharing is set to "Anyone with the link can view"
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="ghost" className="sm:mr-auto" onClick={() => navigate(false)} disabled={!isValid}>
              Start blank
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => navigate(true)} disabled={!isValid}>
              Generate dashboard →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
