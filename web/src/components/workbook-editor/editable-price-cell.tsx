"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import styles from "./workbook-editor-components.module.css"

export type PriceField = "net_price" | "selling_price"

export function parseVndDraft(value: string): number | null {
  const normalized = value.trim().replace(/[.,\s]/g, "")
  if (!/^\d+$/.test(normalized)) return null
  const amount = Number(normalized)
  return Number.isSafeInteger(amount) ? amount : null
}

function formatVnd(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)
    : value == null
      ? ""
      : String(value)
}

export function EditablePriceCell({
  ariaLabel,
  draft,
  editable,
  error,
  onChange,
  value,
}: {
  ariaLabel: string
  draft?: string
  editable: boolean
  error?: string
  onChange: (value: string) => void
  value: unknown
}) {
  if (!editable) {
    return (
      <span className={styles.editableValue}>
        {formatVnd(value) || "-"}
      </span>
    )
  }

  return (
    <div className={styles.priceEditor}>
      <Input
        aria-invalid={Boolean(error)}
        aria-label={ariaLabel}
        className={cn(
          styles.priceInput,
          draft !== undefined && styles.priceInputDirty,
          error && styles.priceInputError,
        )}
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        value={draft ?? formatVnd(value)}
      />
      {error ? (
        <p className={styles.cellError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
