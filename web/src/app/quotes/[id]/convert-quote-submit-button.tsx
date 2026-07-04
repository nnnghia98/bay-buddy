"use client"

import { ActionSubmitButton } from "@/components/form-submit-button"

type ConvertQuoteSubmitButtonProps = {
  label: string
  pendingLabel: string
}

export function ConvertQuoteSubmitButton({
  label,
  pendingLabel,
}: ConvertQuoteSubmitButtonProps) {
  return <ActionSubmitButton idleLabel={label} pendingLabel={pendingLabel} />
}
