"use client"

import * as React from "react"

import { useCurrentFieldPreference } from "@/components/configured-field"
import { cn } from "@/lib/utils"
import styles from "./ui.module.css"

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, children, ...props }, ref) => {
  const preference = useCurrentFieldPreference()
  return <label ref={ref} className={cn(styles.label, className)} {...props}>{preference?.label || children}</label>
})
Label.displayName = "Label"

export { Label }
