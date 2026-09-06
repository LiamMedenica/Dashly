export default function Loading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center px-6">
      <div className="size-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">Generating your dashboard…</p>
        <p className="text-sm text-muted-foreground">Analysing your data and choosing the best charts</p>
      </div>
    </div>
  )
}
