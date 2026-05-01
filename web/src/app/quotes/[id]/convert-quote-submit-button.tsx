"use client"

import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

type ConvertQuoteSubmitButtonProps = {
  label: string
  pendingLabel: string
}

export function ConvertQuoteSubmitButton({
  label,
  pendingLabel,
}: ConvertQuoteSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button disabled={pending} type="submit">
      {pending ? pendingLabel : label}
    </Button>
  )
}
