import { Skeleton } from "@workspace/ui/components/skeleton"

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-sidebar">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
    </div>
  )
}
