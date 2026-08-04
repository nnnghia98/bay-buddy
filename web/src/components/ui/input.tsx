import * as React from "react"

import { cn } from "@/lib/utils"
import styles from "./ui.module.css"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, lang, type, ...props }, ref) => {
    const inputLang =
      lang ??
      (type === "date" || type === "datetime-local" || type === "month" || type === "time"
        ? "vi-VN"
        : undefined)

    return (
      <input
        type={type}
        className={cn(styles.input, className)}
        ref={ref}
        lang={inputLang}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
