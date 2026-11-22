import Link from "next/link"
import { cn } from "@/lib/utils"

// Yellow tilted block, like a store's sign
export function Logo({
  href,
  className
}: {
  href: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-display bg-store-yellow text-store-navy inline-block -rotate-2 px-2.5 py-1 text-lg leading-none",
        className
      )}
    >
      PICKFLICK
    </Link>
  )
}
