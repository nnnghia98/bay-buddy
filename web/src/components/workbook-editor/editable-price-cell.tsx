"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
      <span className="block min-w-40 px-3 py-3 text-right font-mono text-sm font-semibold tabular-nums text-foreground/75">
        {formatVnd(value) || "-"}
      </span>
    )
  }

  return (
    <div className="min-w-36 px-2 py-1.5">
      <Input
        aria-invalid={Boolean(error)}
        aria-label={ariaLabel}
        className={cn(
          "h-9 border-primary/25 bg-white text-right font-mono text-sm font-semibold tabular-nums shadow-none focus-visible:border-primary",
          draft !== undefined && "border-primary/45 bg-primary/[0.055] ring-1 ring-primary/10",
          error && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200",
        )}
        inputMode="numeric"
        onChange={(event) => onChange(event.target.value)}
        value={draft ?? formatVnd(value)}
      />
      {error ? (
        <p className="mt-1 max-w-36 text-right text-[11px] font-medium leading-4 text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
