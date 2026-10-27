"use client"

import * as React from "react"

import { satisfiesPersonalRules } from "@/lib/personal-field-validation"
import { useCurrentFieldPreference, usePersonalValidationMessage } from "@/components/configured-field"
import { cn } from "@/lib/utils"
import styles from "./ui.module.css"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, lang, type, ...props }, ref) => {
    const validationMessage = usePersonalValidationMessage()
    const localRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => localRef.current!)
    const configuredPreference = useCurrentFieldPreference()
    const preference = configuredPreference?.visible === false ? undefined : configuredPreference
    React.useEffect(() => {
      const node = localRef.current
      if (node && !node.readOnly) node.setCustomValidity(satisfiesPersonalRules(node.value, preference, type !== "number" && (props.inputMode === "numeric" || props.inputMode === "decimal")) ? "" : validationMessage)
    }, [preference, props.value, props.inputMode, type, validationMessage])
    const inputLang =
      lang ??
      (type === "date" || type === "datetime-local" || type === "month" || type === "time"
        ? "vi-VN"
        : undefined)

    return (
      <input
        type={type}
        className={cn(styles.input, className)}
        ref={localRef}
        lang={inputLang}
        {...props}
        onChange={event => {
          event.currentTarget.setCustomValidity(satisfiesPersonalRules(event.currentTarget.value, preference, type !== "number" && (props.inputMode === "numeric" || props.inputMode === "decimal")) ? "" : validationMessage)
          props.onChange?.(event)
        }}
        required={props.required || (preference?.visible !== false && preference?.required)}
        minLength={preference?.min_length == null ? props.minLength : Math.max(props.minLength ?? 0, preference.min_length)}
        maxLength={preference?.max_length == null ? props.maxLength : Math.min(props.maxLength ?? Infinity, preference.max_length)}
        min={preference?.minimum == null ? props.min : Math.max(Number(props.min ?? -Infinity), preference.minimum)}
        max={preference?.maximum == null ? props.max : Math.min(Number(props.max ?? Infinity), preference.maximum)}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
