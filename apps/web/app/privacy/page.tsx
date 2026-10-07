"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide directly, including your name, email address, and account preferences when you register. We also collect usage data such as the number of dashboards created and AI generation usage.",
  },
  {
    title: "2. Google Sheets Data",
    body: "When you provide a Google Sheets share URL, we read the data from that sheet to generate your dashboard. We do not store your raw spreadsheet data on our servers — only the dashboard layout (chart configurations, tile positions) is saved to your account.",
  },
  {
    title: "3. How We Use Your Information",
    body: "We use your information to provide and improve the DataBubble service, send transactional emails (account confirmation, password reset), enforce usage limits based on your subscription plan, and communicate important product updates.",
  },
  {
    title: "4. Data Storage and Security",
    body: "Your account data is stored securely using Supabase, which uses industry-standard encryption at rest and in transit. We never store payment card details — all billing is handled by Stripe.",
  },
  {
    title: "5. Cookies",
    body: "We use cookies solely for authentication purposes (to keep you signed in between sessions). We do not use tracking or advertising cookies. You can disable cookies in your browser, but this will prevent you from staying signed in.",
  },
  {
    title: "6. Third-Party Services",
    body: "We use the following third-party services: Supabase (authentication and database), Stripe (billing), and Anthropic Claude (AI dashboard generation). Each processes only the minimum data necessary to provide their service.",
  },
  {
    title: "7. Data Sharing",
    body: "We do not sell your personal data. We do not share your data with third parties except the processors listed above, or where required by law.",
  },
  {
    title: "8. Your Rights",
    body: "You have the right to access, correct, or delete your personal data at any time. You can delete your account directly from your account settings page, which permanently removes all associated data. For other requests, contact us at privacy@databubble.app.",
  },
  {
    title: "9. Data Retention",
    body: "We retain your account data for as long as your account is active. If you delete your account, all personal data is permanently deleted within 30 days.",
  },
  {
    title: "10. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. We will notify you of significant changes via email. Continued use of the service after changes constitutes acceptance of the updated policy.",
  },
  {
    title: "11. Contact",
    body: "For any privacy-related questions or requests, please contact us at privacy@databubble.app.",
  },
]

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
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
