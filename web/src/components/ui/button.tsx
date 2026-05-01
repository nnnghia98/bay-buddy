import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium tracking-[0.08px] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-[12px] bg-primary text-primary-foreground shadow-[var(--shadow-md)] hover:-translate-y-0.5 hover:bg-chart-2 hover:shadow-[var(--shadow-lg)]",
        destructive:
          "rounded-[12px] bg-destructive text-primary-foreground shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
        outline:
          "rounded-[12px] border border-border bg-card text-card-foreground shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent/50 hover:text-accent-foreground hover:shadow-[var(--shadow-md)]",
        secondary:
          "rounded-[12px] bg-secondary text-secondary-foreground shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:bg-muted hover:shadow-[var(--shadow-md)]",
        ghost:
          "rounded-[12px] hover:-translate-y-0.5 hover:bg-accent/55 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
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
