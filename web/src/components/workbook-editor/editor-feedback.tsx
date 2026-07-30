"use client"

import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, CircleAlert, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import patterns from "@/styles/ui-patterns.module.css"
import styles from "./workbook-editor-components.module.css"

export type EditorSaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict"

export function EditorFeedback({
  action,
  message,
  state,
}: {
  action?: ReactNode
  message?: string
  state: EditorSaveState
}) {
  if (!message) return null

  const Icon =
    state === "saving"
      ? Loader2
      : state === "saved"
        ? CheckCircle2
        : state === "conflict"
          ? AlertTriangle
          : CircleAlert

  return (
    <div
      aria-live="polite"
      className={cn(
        styles.feedback,
        (state === "idle" || state === "dirty" || state === "saving")
          && styles.feedbackInfo,
        state === "saved" && styles.feedbackSuccess,
        state === "error" && styles.feedbackError,
        state === "conflict" && styles.feedbackWarning,
      )}
      role={state === "error" || state === "conflict" ? "alert" : "status"}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          styles.feedbackIcon,
          state === "saving" && patterns.spinner,
        )}
      />
      <span className={styles.feedbackMessage}>{message}</span>
      {action ? <div className={styles.feedbackAction}>{action}</div> : null}
    </div>
  )
}
