"use client"

import * as React from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { CircleSlash, Loader2, ReceiptText, Wallet } from "lucide-react"
import { toast } from "sonner"

import { recordPaymentAction } from "@/actions/finance"
import { Button } from "@/components/ui/button"
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
import {
  initialRecordPaymentActionState,
  paymentMethodOptions,
  recordPaymentFormSchema,
  type RecordPaymentFormValues,
} from "@/schemas"
import { useI18n } from "@/locales/client"

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
    <Button className="min-w-36" disabled={pending} type="submit">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
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
}: PaymentDialogProps) {
  const t = useI18n()
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

  const amountInWords = displayAmount
    ? convertNumberToVietnameseWords(parseCurrencyInput(displayAmount))
    : t("customers.ledger.paymentDialog.amountPlaceholder")

  React.useEffect(() => {
    if (state.status === "success") {
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
  }, [onSettled, state, t])

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
        <Button className="rounded-full px-5">
          <Wallet className="h-4 w-4" />
          {t("customers.ledger.paymentDialog.open")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("customers.ledger.paymentDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("customers.ledger.paymentDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" onSubmit={handleSubmit}>
          <input name="customer_id" type="hidden" value={customerId} />

          <div className="space-y-2">
            <Label htmlFor="amount">{t("customers.ledger.paymentDialog.fields.amount")}</Label>
            <Input
              id="amount_display"
              inputMode="numeric"
              onChange={(event) => setDisplayAmount(formatCurrencyInput(event.target.value))}
              placeholder="1,000,000"
              value={displayAmount}
            />
            <input name="amount" type="hidden" value={displayAmount} />
            <p className="text-sm leading-6 text-slate-500">
              {t("customers.ledger.amountInWords")}: {amountInWords}
            </p>
            {getFieldError("amount") ? (
              <p className="text-sm text-red-600">{getFieldError("amount")}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="method">{t("customers.ledger.paymentDialog.fields.method")}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                id="method"
                name="method"
                onChange={(event) =>
                  setSelectedMethod(event.target.value as RecordPaymentFormValues["method"])
                }
                value={selectedMethod}
              >
                {paymentMethodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {getFieldError("method") ? (
                <p className="text-sm text-red-600">{getFieldError("method")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="linked_ticket_id">
                {t("customers.ledger.paymentDialog.fields.linkedTicket")}
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                defaultValue=""
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
                <p className="text-sm text-red-600">
                  {getFieldError("linked_ticket_id")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t("customers.ledger.paymentDialog.fields.note")}</Label>
            <Textarea
              id="note"
              name="note"
              placeholder={t("customers.ledger.paymentDialog.fields.notePlaceholder")}
            />
            {getFieldError("note") ? (
              <p className="text-sm text-red-600">{getFieldError("note")}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence_url">
              {t("customers.ledger.paymentDialog.fields.evidence")}
            </Label>
            <div className="relative">
              <ReceiptText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                id="evidence_url"
                name="evidence_url"
                onChange={(event) => setEvidenceUrl(event.target.value)}
                placeholder="https://..."
                value={evidenceUrl}
              />
            </div>
            <p className="text-sm leading-6 text-slate-500">
              {t("customers.ledger.paymentDialog.fields.evidenceHint")}
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              {evidenceUrl.trim() ? (
                <>
                  <ReceiptText className="h-4 w-4 text-cyan-700" />
                  <span>
                    {t("customers.ledger.paymentDialog.fields.evidenceReady")}
                  </span>
                </>
              ) : (
                <>
                  <CircleSlash className="h-4 w-4 text-slate-400" />
                  <span>
                    {t("customers.ledger.paymentDialog.fields.evidenceEmpty")}
                  </span>
                </>
              )}
            </div>
            {getFieldError("evidence_url") ? (
              <p className="text-sm text-red-600">{getFieldError("evidence_url")}</p>
            ) : null}
          </div>

          <DialogFooter>
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
