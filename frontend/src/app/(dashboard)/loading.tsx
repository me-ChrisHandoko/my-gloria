import { Spinner } from "@/components/ui/spinner"

export default function Loading() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Spinner className="size-8 text-sidebar-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
