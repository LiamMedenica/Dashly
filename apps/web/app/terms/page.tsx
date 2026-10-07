"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using DataBubble, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.",
  },
  {
    title: "2. Description of Service",
    body: "DataBubble provides a data visualisation platform that allows users to create interactive dashboards from Google Sheets data. We offer free and paid subscription tiers with varying feature sets.",
  },
  {
    title: "3. User Accounts",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorised use of your account.",
  },
  {
    title: "4. Acceptable Use",
    body: "You agree not to use DataBubble to upload, share, or process data that is illegal, harmful, or violates the rights of others. We reserve the right to terminate accounts that violate these terms.",
  },
  {
    title: "5. Data and Privacy",
    body: "We only read Google Sheets data that you explicitly provide via a share link. We do not store your raw spreadsheet data — only the dashboard layout you create. Please review our Privacy Policy for full details on how we handle your data.",
  },
  {
    title: "6. Subscription and Billing",
    body: "Paid plans are billed monthly. You may cancel at any time and your plan will remain active until the end of the current billing period. We do not offer refunds for partial months.",
  },
  {
    title: "7. Intellectual Property",
    body: "DataBubble and its original content, features, and functionality are owned by DataBubble and are protected by international copyright, trademark, and other intellectual property laws.",
  },
  {
    title: "8. Limitation of Liability",
    body: "DataBubble shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.",
  },
  {
    title: "9. Changes to Terms",
    body: "We reserve the right to modify these terms at any time. We will notify users of significant changes via email. Continued use of the service after changes constitutes acceptance of the new terms.",
  },
  {
    title: "10. Contact",
    body: "If you have any questions about these Terms of Service, please contact us at legal@databubble.app.",
  },
]

export default function TermsPage() {
  const router = useRouter()

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

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: 30 September 2026</p>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="font-semibold text-base mb-2">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
