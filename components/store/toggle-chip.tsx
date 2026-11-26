"use client"

import { cn } from "@/lib/utils"

// An on/off chip in the store look: navy outline, navy fill with yellow text
// when on. Chips sit in a `flex flex-wrap gap-2` row and never wrap their
// label, so long genre names push to the next line instead of overlapping.
export function ToggleChip({
  pressed,
  onPressedChange,
  children,
  className,
  disabled
}: {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "border-store-navy focus-visible:ring-store-red-ink inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap border-2 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        pressed
          ? "bg-store-navy text-store-yellow"
          : "text-store-navy hover:bg-store-navy/10 bg-transparent",
        className
      )}
    >
      {children}
    </button>
  )
}
