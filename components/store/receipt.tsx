import { cn } from "@/lib/utils"

// A rental receipt with a torn zig-zag bottom edge
export function Receipt({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative pb-2", className)}>
      <div className="bg-[#fbfaf6] px-4 pb-5 pt-4 text-xs text-black">
        {children}
      </div>
      <div
        aria-hidden
        className="h-2 w-full"
        style={{
          background:
            "linear-gradient(-45deg, transparent 6px, #fbfaf6 0) 0 0/12px 8px, linear-gradient(45deg, transparent 6px, #fbfaf6 0) 0 0/12px 8px"
        }}
      />
    </div>
  )
}

export function ReceiptRule() {
  return (
    <hr className="my-2 border-0 border-t border-dashed border-neutral-500" />
  )
}

export function ReceiptLine({
  label,
  value,
  className
}: {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex justify-between gap-3", className)}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
