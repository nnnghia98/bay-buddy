import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-linear-to-r from-primary to-chart-2 text-primary-foreground shadow-[var(--shadow-md),0_4px_14px_0_color-mix(in_srgb,var(--primary)_30%,transparent)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg),0_10px_24px_-10px_color-mix(in_srgb,var(--primary)_32%,transparent)]",
        destructive:
          "rounded-full bg-destructive text-primary-foreground shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
        outline:
          "rounded-full border border-border bg-card text-card-foreground shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent hover:text-accent-foreground hover:shadow-[var(--shadow-md),0_8px_20px_-14px_color-mix(in_srgb,var(--primary)_20%,transparent)]",
        secondary:
          "rounded-full bg-secondary text-secondary-foreground shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:bg-secondary/80 hover:shadow-[var(--shadow-md)]",
        ghost:
          "rounded-full hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
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
