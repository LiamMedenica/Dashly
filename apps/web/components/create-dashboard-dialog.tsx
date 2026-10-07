"use client"

import { useState } from "react"
import { Check, Link, ChevronDown } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog, DialogContent, DialogTitle,
} from "@workspace/ui/components/dialog"

interface Props {
  open: boolean
  onClose: () => void
  onNavigate: (generate: boolean, name: string, url: string, notes: string) => void
}

export function CreateDashboardDialog({ open, onClose, onNavigate }: Props) {
  const [name, setName]         = useState("")
  const [url, setUrl]           = useState("")
  const [notes, setNotes]       = useState("")
  const [showNotes, setShowNotes] = useState(false)

  const isValidUrl = url.trim() !== "" && url.includes("docs.google.com/spreadsheets")
  const urlTouched = url.trim() !== ""

  const handleClose = () => {
    setName(""); setUrl(""); setNotes(""); setShowNotes(false)
    onClose()
  }

  const go = (generate: boolean) => {
    onNavigate(generate, name, url, notes)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="p-0 overflow-hidden gap-0 border-0 shadow-2xl rounded-2xl"
        style={{ maxWidth: "58rem" }}
      >
        <DialogTitle className="sr-only">Create a dashboard</DialogTitle>
        <div className="grid md:grid-cols-[5fr_7fr]">

          {/* Left — brand panel */}
          <div
            className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden"
            style={{ background: "linear-gradient(145deg, #1d4ed8 0%, #3b82f6 55%, #60a5fa 100%)" }}
          >
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/[0.06]" />
            <span className="relative text-lg font-bold text-white tracking-tight">DataBubble</span>
            <div className="relative flex flex-col gap-5">
              <h2 className="text-4xl font-extrabold text-white leading-[1.1]">
                Your dashboard<br />in 30 seconds.
              </h2>
              <ul className="flex flex-col gap-2.5">
                {[
                  "AI picks the right charts for you",
                  "Drag, resize, customise freely",
                  "Share with one link",
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-blue-100">
                    <Check className="size-3.5 text-white shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="relative text-xs text-blue-200/70">No credit card required</p>
          </div>

          {/* Right — form */}
          <div className="flex flex-col p-8 bg-white dark:bg-background">
            <h3 className="text-2xl font-extrabold tracking-tight mb-1">New dashboard</h3>
            <p className="text-sm text-muted-foreground mb-7">Drop a sheet link and we&apos;ll handle the rest.</p>

            <div className="flex flex-col gap-3 flex-1">
              {/* Name */}
              <Input
                placeholder="Give it a name  (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-12 text-sm px-4"
              />

              {/* URL */}
              <div className="flex flex-col gap-1.5">
                <div className="relative">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60 pointer-events-none" />
                  <Input
                    type="url"
                    placeholder="Paste your Google Sheets link"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="h-12 text-sm pl-11 font-mono"
                  />
                </div>
                {urlTouched && !isValidUrl && (
                  <p className="text-xs text-destructive pl-1">That doesn&apos;t look like a Google Sheets URL.</p>
                )}
              </div>

              {/* Notes for AI — collapsible */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowNotes(v => !v)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <ChevronDown className={`size-3.5 transition-transform duration-200 ${showNotes ? "rotate-180" : ""}`} />
                  Add notes for the AI
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  style={{ gridTemplateRows: showNotes ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <textarea
                      rows={3}
                      placeholder="e.g. Focus on July only. Skip the Returns column."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-8">
              <Button
                onClick={() => go(true)}
                disabled={!isValidUrl}
                className="w-full h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 font-bold text-base shadow-none"
              >
                Generate with AI →
              </Button>
              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  onClick={() => go(false)}
                  disabled={!isValidUrl}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  Start blank
                </button>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <button
                  onClick={handleClose}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
