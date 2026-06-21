import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[14px] border border-input bg-white px-3.5 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,background-color] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:font-normal placeholder:text-muted-foreground/75 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 [&[inputmode=numeric]]:text-right [&[inputmode=numeric]]:font-semibold [&[inputmode=numeric]::placeholder]:font-normal [&[type=number]]:text-right [&[type=number]]:font-semibold [&[type=number]::placeholder]:font-normal [&[type=search]]:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
