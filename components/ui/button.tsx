import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "ring-offset-background focus-visible:ring-ring font-display inline-flex items-center justify-center gap-2 whitespace-nowrap uppercase tracking-wide transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Yellow with a red drop shadow
        default: "bg-store-yellow text-store-navy shadow-offset-red",
        destructive: "bg-store-red text-store-paper shadow-offset-black",
        // Paper with a black drop shadow
        outline: "bg-store-paper text-store-navy shadow-offset-black",
        secondary: "bg-store-paper text-store-navy shadow-offset-black",
        ghost:
          "text-store-ink hover:bg-store-navy-light active:translate-x-0 active:translate-y-0",
        link: "text-store-yellow normal-case underline-offset-4 hover:underline active:translate-x-0 active:translate-y-0"
      },
      size: {
        default: "min-h-11 px-4 py-2 text-sm",
        sm: "min-h-9 px-3 text-xs",
        lg: "min-h-12 px-6 text-base",
        icon: "size-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
