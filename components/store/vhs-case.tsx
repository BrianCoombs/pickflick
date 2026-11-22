import Link from "next/link"
import { cn } from "@/lib/utils"

interface VhsCaseProps {
  title: string
  subtitle?: React.ReactNode
  href?: string
  sticker?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

// A black clamshell case with a paper label. Links when given an href
export function VhsCase({
  title,
  subtitle,
  href,
  sticker,
  className,
  children
}: VhsCaseProps) {
  const body = (
    <div
      className={cn(
        "bg-store-tape border-store-tape-edge relative rounded-[3px] border-l-[10px] p-2.5",
        href &&
          "transition-transform active:translate-x-[2px] active:translate-y-[2px]",
        className
      )}
    >
      {sticker && <div className="absolute -right-1.5 -top-2.5">{sticker}</div>}
      <div className="paper p-3">
        <div className="font-display text-base leading-tight">{title}</div>
        {subtitle && (
          <div className="mt-1 text-xs text-neutral-600">{subtitle}</div>
        )}
        {children}
      </div>
    </div>
  )
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}
