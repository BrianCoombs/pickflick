import { cn } from "@/lib/utils"

// Off-white label paper panel
export function Paper({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("paper p-4", className)}>{children}</div>
}

export function PaperTitle({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2 className={cn("font-display text-store-navy mb-2 text-sm", className)}>
      {children}
    </h2>
  )
}
