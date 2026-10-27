"use client"
import { forwardRef, type SelectHTMLAttributes } from "react"
import { useCurrentFieldPreference } from "./configured-field"

export const ConfiguredSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function ConfiguredSelect(props, ref) {
  const preference = useCurrentFieldPreference()
  return <select {...props} ref={ref} required={props.required || (preference?.visible !== false && preference?.required)} />
})
