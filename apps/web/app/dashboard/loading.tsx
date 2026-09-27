// Shown by Next.js while the dashboard server component is fetching + generating.

export default function Loading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 text-center px-6">
      {/* Three bubbles that pulse in sequence to suggest "thinking" */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block rounded-full bg-primary"
            style={{
              width: 10,
              height: 10,
              animation: "db-bubble 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">Building your dashboard…</p>
        <p className="text-sm text-muted-foreground">Analysing your data and choosing the best charts</p>
      </div>

      <style>{`
        @keyframes db-bubble {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
