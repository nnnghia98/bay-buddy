"use client"

import * as React from "react"

import { useCurrentFieldPreference, usePersonalValidationMessage } from "@/components/configured-field"
import { satisfiesPersonalRules } from "@/lib/personal-field-validation"
import { cn } from "@/lib/utils"
import styles from "./ui.module.css"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    const localRef = React.useRef<HTMLTextAreaElement>(null)
    React.useImperativeHandle(ref, () => localRef.current!)
    const validationMessage = usePersonalValidationMessage()
    const configuredPreference = useCurrentFieldPreference()
    const preference = configuredPreference?.visible === false ? undefined : configuredPreference
    React.useEffect(() => {
      const node = localRef.current
      if (node && !node.readOnly) node.setCustomValidity(satisfiesPersonalRules(node.value, preference) ? "" : validationMessage)
    }, [preference, props.value, validationMessage])
    return (
      <textarea
        className={cn(styles.textarea, className)}
        ref={localRef}
        {...props}
        onChange={event => {
          event.currentTarget.setCustomValidity(satisfiesPersonalRules(event.currentTarget.value, preference) ? "" : validationMessage)
          props.onChange?.(event)
        }}
        required={props.required || (preference?.visible !== false && preference?.required)}
        minLength={preference?.min_length == null ? props.minLength : Math.max(props.minLength ?? 0, preference.min_length)}
        maxLength={preference?.max_length == null ? props.maxLength : Math.min(props.maxLength ?? Infinity, preference.max_length)}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
