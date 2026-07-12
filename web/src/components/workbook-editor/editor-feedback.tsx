"use client"

import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, CircleAlert, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

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
        "flex items-center gap-2 border-t px-4 py-2 text-sm",
        (state === "idle" || state === "dirty") && "border-blue-100 bg-blue-50 text-blue-700",
        state === "saving" && "border-blue-100 bg-blue-50 text-blue-700",
        state === "saved" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        state === "error" && "border-red-200 bg-red-50 text-red-700",
        state === "conflict" && "border-amber-200 bg-amber-50 text-amber-800",
      )}
      role={state === "error" || state === "conflict" ? "alert" : "status"}
    >
      <Icon
        aria-hidden="true"
        className={cn("h-4 w-4 shrink-0", state === "saving" && "animate-spin")}
      />
      <span>{message}</span>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  )
}
