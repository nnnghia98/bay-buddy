"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { CircleSlash, Loader2, ReceiptText, Wallet } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { recordPaymentAction } from "@/actions/finance"
import { selectInputClassName } from "@/components/operations-ui"
import { Button } from "@/components/ui/button"
import type { ButtonProps } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { convertNumberToVietnameseWords } from "@/lib/number-to-vn-words"
import { cn } from "@/lib/utils"
import {
  createRecordPaymentFormSchema,
  getRecordPaymentValidationMessages,
  initialRecordPaymentActionState,
  paymentMethodOptions,
  type RecordPaymentFormValues,
} from "@/schemas/finance"
import { useI18n } from "@/locales/client"
import styles from "./payment-dialog.module.css"

type TicketOption = {
  id: string
  label: string
}

type OptimisticPaymentPayload = {
  amount: number
  note: string
}

type PaymentDialogProps = {
  customerId: string
  ticketOptions: TicketOption[]
  onOptimisticSubmit: (payload: OptimisticPaymentPayload) => void
  onSettled: (status: "success" | "error") => void
  disabled?: boolean
  defaultLinkedTicketId?: string
  triggerLabel?: string
  triggerSize?: ButtonProps["size"]
  triggerVariant?: ButtonProps["variant"]
}

type ClientErrors = Partial<Record<keyof RecordPaymentFormValues, string>>

function formatCurrencyInput(value: string): string {
  const digitsOnly = value.replace(/[^\d]/g, "")
  return digitsOnly ? Number(digitsOnly).toLocaleString("en-US") : ""
}

function parseCurrencyInput(value: string): number {
  const digitsOnly = value.replace(/[^\d]/g, "")
  return digitsOnly ? Number(digitsOnly) : 0
}

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useI18n()

  return (
    <Button className={styles.submitButton} disabled={pending} type="submit">
      {pending ? (
        <>
          <Loader2 className={`${patterns.iconSmall} ${patterns.spinner}`} />
          {t("customers.ledger.paymentDialog.submitting")}
        </>
      ) : (
        t("customers.ledger.paymentDialog.submit")
      )}
    </Button>
  )
}

export function PaymentDialog({
  customerId,
  ticketOptions,
  onOptimisticSubmit,
  onSettled,
  disabled = false,
  defaultLinkedTicketId = "",
  triggerLabel,
  triggerSize = "lg",
  triggerVariant = "default",
}: PaymentDialogProps) {
  const t = useI18n()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [displayAmount, setDisplayAmount] = React.useState("")
  const [evidenceUrl, setEvidenceUrl] = React.useState("")
  const [clientErrors, setClientErrors] = React.useState<ClientErrors>({})
  const [selectedMethod, setSelectedMethod] = React.useState<
    RecordPaymentFormValues["method"]
  >("Chuyển khoản")
  const [state, formAction] = useActionState(
    recordPaymentAction,
    initialRecordPaymentActionState,
  )
  const recordPaymentFormSchema = React.useMemo(
    () =>
      createRecordPaymentFormSchema(getRecordPaymentValidationMessages(t)),
    [t],
  )

  const amountInWords = displayAmount
    ? convertNumberToVietnameseWords(parseCurrencyInput(displayAmount))
    : t("customers.ledger.paymentDialog.amountPlaceholder")

  const paymentMethodLabels: Record<RecordPaymentFormValues["method"], string> = {
    "Chuyển khoản": t(
      "customers.ledger.paymentDialog.fields.methodOptions.bankTransfer",
    ),
    "Tiền mặt": t("customers.ledger.paymentDialog.fields.methodOptions.cash"),
    AST: t("customers.ledger.paymentDialog.fields.methodOptions.ast"),
    THF: t("customers.ledger.paymentDialog.fields.methodOptions.thf"),
  }

  React.useEffect(() => {
    if (state.status === "success") {
      router.refresh()
      toast.success(state.message ?? t("customers.ledger.paymentDialog.success"))
      setClientErrors({})
      setDisplayAmount("")
      setEvidenceUrl("")
      setSelectedMethod("Chuyển khoản")
      setOpen(false)
      onSettled("success")
      return
    }

    if (state.status === "error" && state.submittedAt) {
      toast.error(state.message ?? t("customers.ledger.paymentDialog.error"))
      onSettled("error")
    }
  }, [onSettled, router, state, t])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget)
    const parsedValues = recordPaymentFormSchema.safeParse({
      customer_id: customerId,
      amount: formData.get("amount"),
      method: formData.get("method"),
      note: formData.get("note"),
      evidence_url: formData.get("evidence_url"),
      linked_ticket_id: formData.get("linked_ticket_id"),
    })

    if (!parsedValues.success) {
      event.preventDefault()

      const flattenedErrors = parsedValues.error.flatten().fieldErrors
      setClientErrors({
        customer_id: flattenedErrors.customer_id?.[0],
        amount: flattenedErrors.amount?.[0],
        method: flattenedErrors.method?.[0],
        note: flattenedErrors.note?.[0],
        evidence_url: flattenedErrors.evidence_url?.[0],
        linked_ticket_id: flattenedErrors.linked_ticket_id?.[0],
      })
      return
    }

    setClientErrors({})
    onOptimisticSubmit({
      amount: parsedValues.data.amount,
      note: parsedValues.data.note,
    })
  }

  const getFieldError = (field: keyof RecordPaymentFormValues): string | undefined =>
    clientErrors[field] ?? state.fieldErrors[field]

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button disabled={disabled} size={triggerSize} variant={triggerVariant}>
          <Wallet className={patterns.iconSmall} />
          {triggerLabel ?? t("customers.ledger.paymentDialog.open")}
        </Button>
      </DialogTrigger>

      <DialogContent width="min(92vw, 42rem)">
        <DialogHeader>
          <DialogTitle>{t("customers.ledger.paymentDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("customers.ledger.paymentDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className={patterns.contentStack} onSubmit={handleSubmit}>
          <input name="customer_id" type="hidden" value={customerId} />

          <div className={styles.amountSurface}>
            <div className={patterns.fieldStack}>
              <Label htmlFor="amount">
                {t("customers.ledger.paymentDialog.fields.amount")}
              </Label>
              <Input
                id="amount_display"
                inputMode="numeric"
                onChange={(event) => setDisplayAmount(formatCurrencyInput(event.target.value))}
                placeholder={t("customers.ledger.paymentDialog.fields.amountInputPlaceholder")}
                value={displayAmount}
              />
              <input name="amount" type="hidden" value={displayAmount} />
              <p className={patterns.mutedText}>
                {t("customers.ledger.amountInWords")}: {amountInWords}
              </p>
              {getFieldError("amount") ? (
                <p className={patterns.errorText}>{getFieldError("amount")}</p>
              ) : null}
            </div>
          </div>

          <div className={patterns.twoColumnGrid}>
            <div className={patterns.fieldStack}>
              <Label htmlFor="method">{t("customers.ledger.paymentDialog.fields.method")}</Label>
              <select
                className={selectInputClassName}
                id="method"
                name="method"
                onChange={(event) =>
                  setSelectedMethod(event.target.value as RecordPaymentFormValues["method"])
                }
                value={selectedMethod}
              >
                {paymentMethodOptions.map((option) => (
                  <option key={option} value={option}>
                    {paymentMethodLabels[option]}
                  </option>
                ))}
              </select>
              {getFieldError("method") ? (
                <p className={patterns.errorText}>{getFieldError("method")}</p>
              ) : null}
            </div>

            <div className={patterns.fieldStack}>
              <Label htmlFor="linked_ticket_id">
                {t("customers.ledger.paymentDialog.fields.linkedTicket")}
              </Label>
              <select
                className={selectInputClassName}
                defaultValue={defaultLinkedTicketId}
                id="linked_ticket_id"
                name="linked_ticket_id"
              >
                <option value="">
                  {t("customers.ledger.paymentDialog.fields.linkedTicketPlaceholder")}
                </option>
                {ticketOptions.map((ticketOption) => (
                  <option key={ticketOption.id} value={ticketOption.id}>
                    {ticketOption.label}
                  </option>
                ))}
              </select>
              {getFieldError("linked_ticket_id") ? (
                <p className={patterns.errorText}>
                  {getFieldError("linked_ticket_id")}
                </p>
              ) : null}
            </div>
          </div>

          <div className={patterns.fieldStack}>
            <Label htmlFor="note">{t("customers.ledger.paymentDialog.fields.note")}</Label>
            <Textarea
              id="note"
              name="note"
              placeholder={t("customers.ledger.paymentDialog.fields.notePlaceholder")}
            />
            {getFieldError("note") ? (
              <p className={patterns.errorText}>{getFieldError("note")}</p>
            ) : null}
          </div>

          <div className={styles.evidenceSurface}>
            <div className={patterns.fieldStack}>
              <Label htmlFor="evidence_url">
                {t("customers.ledger.paymentDialog.fields.evidence")}
              </Label>
              <div className={styles.inputIconWrapper}>
                <ReceiptText className={styles.leadingIcon} />
                <Input
                  className={styles.inputWithIcon}
                  id="evidence_url"
                  name="evidence_url"
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  placeholder={t("customers.ledger.paymentDialog.fields.evidencePlaceholder")}
                  value={evidenceUrl}
                />
              </div>
              <p className={patterns.mutedText}>
                {t("customers.ledger.paymentDialog.fields.evidenceHint")}
              </p>
            </div>

            <div
              className={cn(
                styles.evidenceStatus,
                evidenceUrl.trim() && styles.evidenceReady,
              )}
            >
              {evidenceUrl.trim() ? (
                <>
                  <ReceiptText className={patterns.iconSmall} />
                  <span>{t("customers.ledger.paymentDialog.fields.evidenceReady")}</span>
                </>
              ) : (
                <>
                  <CircleSlash className={patterns.iconSmall} />
                  <span>{t("customers.ledger.paymentDialog.fields.evidenceEmpty")}</span>
                </>
              )}
            </div>
            {getFieldError("evidence_url") ? (
              <p className={patterns.errorText}>{getFieldError("evidence_url")}</p>
            ) : null}
          </div>

          <DialogFooter className={styles.footer}>
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              {t("customers.ledger.paymentDialog.cancel")}
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
