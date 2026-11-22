import Link from "next/link"
import { cn } from "@/lib/utils"

// A tape seen from the side on a shelf, title written on the label
export function TapeSpine({
  title,
  href,
  className
}: {
  title: string
  href?: string
  className?: string
}) {
  const spine = (
    <div
      className={cn(
        "bg-store-tape relative h-24 w-12 shrink-0 rounded-[2px] border-t-[5px] border-[#333]",
        className
      )}
      title={title}
    >
      <span className="bg-store-paper absolute inset-x-1.5 inset-y-2.5 rotate-180 overflow-hidden p-1 text-[9px] font-semibold uppercase leading-tight text-black [writing-mode:vertical-rl]">
        {title}
      </span>
    </div>
  )
  return href ? <Link href={href}>{spine}</Link> : spine
}

export function Shelf({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-end gap-2 overflow-x-auto pb-1", className)}>
      {children}
    </div>
  )
}
