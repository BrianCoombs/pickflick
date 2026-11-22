import { cn } from "@/lib/utils"

// Hand-written pink sticker
export function Sticker({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "font-marker bg-store-pink shadow-offset-black inline-block rotate-3 px-2.5 py-1.5 text-sm leading-tight text-black",
        className
      )}
    >
      {children}
    </span>
  )
}
