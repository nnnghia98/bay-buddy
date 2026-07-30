import * as React from "react"

import { cn } from "@/lib/utils"
import styles from "./ui.module.css"

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn(styles.label, className)} {...props} />
))
Label.displayName = "Label"

export { Label }
