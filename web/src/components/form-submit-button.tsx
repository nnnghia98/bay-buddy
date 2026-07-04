"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"

import { Button, type ButtonProps } from "@/components/ui/button"

type ActionSubmitButtonProps = Omit<ButtonProps, "type"> & {
  idleLabel: string
  pendingLabel: string
}

export function ActionSubmitButton({
  children,
  disabled,
  idleLabel,
  pendingLabel,
  ...props
}: ActionSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button disabled={pending || disabled} type="submit" {...props}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children ?? idleLabel
      )}
    </Button>
  )
}
