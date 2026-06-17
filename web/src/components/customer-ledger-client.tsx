"use client"

import * as React from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { ExternalLink, Loader2, PencilLine, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  updateTicketLedgerRecordAction,
  updateTransactionLedgerRecordAction,
  type LedgerCorrectionActionState,
} from "@/actions/finance"
import {
  toggleCustomerActiveAction,
  updateCustomerAction,
} from "@/actions/customer-management"
import { PaymentDialog } from "@/components/payment-dialog"
import {
  Panel,
  PanelHeaderRow,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { convert_number_to_vn_words } from "@/lib/number-to-vn-words"
import {
  applyOptimisticPaymentToLedger,
  cloneLedgerState,
} from "@/lib/finance-core"
import { expireStoredSession } from "@/lib/auth-storage"
import { SESSION_EXPIRED_LOGIN_PATH } from "@/lib/auth-token"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import {
  createUpdateCustomerFormSchema,
  getCustomerManagementValidationMessages,
  initialCustomerManagementActionState,
  type CustomerLedger,
  type CustomerManagementActionState,
  type CustomerManagementField,
} from "@/schemas"

type CustomerLedgerClientProps = {
  currentUserRole: "ADMIN" | "STAFF"
  customerId: string
  initialLedger: CustomerLedger | null
}

type CustomerClientErrors = Partial<Record<CustomerManagementField, string>>
type LedgerEntry = CustomerLedger["entries"][number]

const initialLedgerCorrectionActionState: LedgerCorrectionActionState = {
  status: "idle",
  fieldErrors: {},
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatSignedCurrency(amount: number): string {
  if (amount === 0) {
    return formatCurrency(amount)
  }

  const sign = amount > 0 ? "+" : "-"
  return `${sign}${formatCurrency(Math.abs(amount))}`
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value)
}

function formatDateTimeLocal(value: Date): string {
  const year = value.getFullYear()
  const month = (value.getMonth() + 1).toString().padStart(2, "0")
  const day = value.getDate().toString().padStart(2, "0")
  const hours = value.getHours().toString().padStart(2, "0")
  const minutes = value.getMinutes().toString().padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function CustomerActionSubmitButton({
  idleLabel,
  pendingLabel,
  variant = "default",
}: {
  idleLabel: string
  pendingLabel: string
  variant?: "default" | "outline"
}) {
  const { pending } = useFormStatus()

  return (
    <Button disabled={pending} type="submit" variant={variant}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </Button>
  )
}

function getCustomerFieldError(
  field: CustomerManagementField,
  clientErrors: CustomerClientErrors,
  state: CustomerManagementActionState,
): string | undefined {
  return clientErrors[field] ?? state.fieldErrors[field]
}

function EditCustomerDialog({
  customer,
}: {
  customer: CustomerLedger["customer"]
}) {
  const t = useI18n()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [clientErrors, setClientErrors] = React.useState<CustomerClientErrors>({})
  const [name, setName] = React.useState(customer.name)
  const [type, setType] = React.useState(customer.type)
  const [email, setEmail] = React.useState(customer.email ?? "")
  const [phone, setPhone] = React.useState(customer.phone ?? "")
  const [address, setAddress] = React.useState(customer.address ?? "")
  const [taxCode, setTaxCode] = React.useState(customer.tax_code ?? "")
  const [state, formAction] = useActionState(
    updateCustomerAction,
    initialCustomerManagementActionState,
  )
  const validationMessages = React.useMemo(
    () => getCustomerManagementValidationMessages(t),
    [t],
  )
  const formSchema = React.useMemo(
    () => createUpdateCustomerFormSchema(validationMessages),
    [validationMessages],
  )

  React.useEffect(() => {
    if (open) {
      setName(customer.name)
      setType(customer.type)
      setEmail(customer.email ?? "")
      setPhone(customer.phone ?? "")
      setAddress(customer.address ?? "")
      setTaxCode(customer.tax_code ?? "")
      setClientErrors({})
    }
  }, [customer, open])

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? t("customers.management.actions.updateSuccess"))
      setOpen(false)
      setClientErrors({})
      router.refresh()
      return
    }

    if (state.status === "error" && state.submittedAt) {
      toast.error(state.message ?? t("customers.management.actions.failure"))
    }
  }, [router, state, t])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget)
    const parsedValues = formSchema.safeParse({
      customer_id: formData.get("customer_id"),
      name: formData.get("name"),
      type: formData.get("type"),
      is_active: formData.get("is_active"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      tax_code: formData.get("tax_code"),
    })

    if (!parsedValues.success) {
      event.preventDefault()
      const flattenedErrors = parsedValues.error.flatten().fieldErrors
      setClientErrors({
        customer_id: flattenedErrors.customer_id?.[0],
        name: flattenedErrors.name?.[0],
        type: flattenedErrors.type?.[0],
        is_active: flattenedErrors.is_active?.[0],
        email: flattenedErrors.email?.[0],
        phone: flattenedErrors.phone?.[0],
        address: flattenedErrors.address?.[0],
        tax_code: flattenedErrors.tax_code?.[0],
      })
      return
    }

    setClientErrors({})
  }

  const selectClassName =
    "flex h-11 w-full rounded-[14px] border border-input bg-white px-3.5 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary"

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">
          <PencilLine className="h-4 w-4" />
          {t("customers.management.editAction")}
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[min(92vw,42rem)]">
        <DialogHeader>
          <DialogTitle>{t("customers.management.dialogs.edit.title")}</DialogTitle>
          <DialogDescription>
            {t("customers.management.dialogs.edit.description")}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-5" onSubmit={handleSubmit}>
          <input name="customer_id" type="hidden" value={customer.id} />
          <input name="is_active" type="hidden" value={String(customer.is_active)} />

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">
                {t("customers.management.fields.name")}
              </Label>
              <Input
                id="customer-name"
                name="name"
                onChange={(event) => setName(event.target.value)}
                placeholder={t("customers.management.fields.namePlaceholder")}
                value={name}
              />
              {getCustomerFieldError("name", clientErrors, state) ? (
                <p className="text-sm text-red-600">
                  {getCustomerFieldError("name", clientErrors, state)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-type">
                {t("customers.management.fields.type")}
              </Label>
              <select
                className={selectClassName}
                id="customer-type"
                name="type"
                onChange={(event) =>
                  setType(event.target.value as CustomerLedger["customer"]["type"])
                }
                value={type}
              >
                <option value="INDIVIDUAL">
                  {t("customers.management.types.INDIVIDUAL")}
                </option>
                <option value="BUSINESS">
                  {t("customers.management.types.BUSINESS")}
                </option>
              </select>
              {getCustomerFieldError("type", clientErrors, state) ? (
                <p className="text-sm text-red-600">
                  {getCustomerFieldError("type", clientErrors, state)}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-phone">
                  {t("customers.management.fields.phone")}
                </Label>
                <Input
                  id="customer-phone"
                  name="phone"
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t("customers.management.fields.phonePlaceholder")}
                  value={phone}
                />
                {getCustomerFieldError("phone", clientErrors, state) ? (
                  <p className="text-sm text-red-600">
                    {getCustomerFieldError("phone", clientErrors, state)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-email">
                  {t("customers.management.fields.email")}
                </Label>
                <Input
                  id="customer-email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("customers.management.fields.emailPlaceholder")}
                  value={email}
                />
                {getCustomerFieldError("email", clientErrors, state) ? (
                  <p className="text-sm text-red-600">
                    {getCustomerFieldError("email", clientErrors, state)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-address">
                {t("customers.management.fields.address")}
              </Label>
              <Input
                id="customer-address"
                name="address"
                onChange={(event) => setAddress(event.target.value)}
                placeholder={t("customers.management.fields.addressPlaceholder")}
                value={address}
              />
              {getCustomerFieldError("address", clientErrors, state) ? (
                <p className="text-sm text-red-600">
                  {getCustomerFieldError("address", clientErrors, state)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-tax-code">
                {t("customers.management.fields.taxCode")}
              </Label>
              <Input
                id="customer-tax-code"
                name="tax_code"
                onChange={(event) => setTaxCode(event.target.value)}
                placeholder={t("customers.management.fields.taxCodePlaceholder")}
                value={taxCode}
              />
              {getCustomerFieldError("tax_code", clientErrors, state) ? (
                <p className="text-sm text-red-600">
                  {getCustomerFieldError("tax_code", clientErrors, state)}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              {t("customers.management.dialogs.cancel")}
            </Button>
            <CustomerActionSubmitButton
              idleLabel={t("customers.management.dialogs.edit.submit")}
              pendingLabel={t("customers.management.dialogs.edit.submitting")}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ToggleCustomerStatusButton({
  customer,
}: {
  customer: CustomerLedger["customer"]
}) {
  const t = useI18n()
  const router = useRouter()
  const [state, formAction] = useActionState(
    toggleCustomerActiveAction,
    initialCustomerManagementActionState,
  )

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? t("customers.management.actions.toggleSuccess"))
      router.refresh()
      return
    }

    if (state.status === "error" && state.submittedAt) {
      toast.error(state.message ?? t("customers.management.actions.failure"))
    }
  }, [router, state, t])

  return (
    <form action={formAction}>
      <input name="customer_id" type="hidden" value={customer.id} />
      <input name="is_active" type="hidden" value={String(!customer.is_active)} />
      <CustomerActionSubmitButton
        idleLabel={
          customer.is_active
            ? t("customers.management.deactivateAction")
            : t("customers.management.activateAction")
        }
        pendingLabel={t("customers.management.toggleSubmitting")}
        variant="outline"
      />
    </form>
  )
}

function getCorrectionError(
  field: string,
  state: LedgerCorrectionActionState | undefined,
): string | undefined {
  return state?.fieldErrors?.[field]
}

function LedgerCorrectionSubmitButton({
  idleLabel,
  pendingLabel,
  destructive = false,
}: {
  idleLabel: string
  pendingLabel: string
  destructive?: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      className={destructive ? "bg-red-600 hover:bg-red-700" : undefined}
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </Button>
  )
}

function LedgerRecordCorrectionDialog({
  customerId,
  entry,
}: {
  customerId: string
  entry: LedgerEntry
}) {
  const t = useI18n()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const action = entry.entry_type === "ticket"
    ? updateTicketLedgerRecordAction
    : updateTransactionLedgerRecordAction
  const [state, formAction] = useActionState(
    action,
    initialLedgerCorrectionActionState,
  )
  const ticket = entry.ticket
  const transaction = entry.transaction
  const transactionCategoryOptions = [
    {
      value: "PAYMENT",
      label: t("customers.ledger.corrections.categories.PAYMENT"),
    },
    {
      value: "DISCOUNT",
      label: t("customers.ledger.corrections.categories.DISCOUNT"),
    },
    {
      value: "ADDITIONAL_FEE",
      label: t("customers.ledger.corrections.categories.ADDITIONAL_FEE"),
    },
    {
      value: "REFUND",
      label: t("customers.ledger.corrections.categories.REFUND"),
    },
  ] as const

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? t("customers.ledger.corrections.updateSuccess"))
      setOpen(false)
      router.refresh()
      return
    }

    if (state.status === "error" && state.submittedAt) {
      toast.error(state.message ?? t("customers.ledger.corrections.failure"))
    }
  }, [router, state, t])

  if (entry.entry_type === "ticket" && !ticket) {
    return null
  }

  if (entry.entry_type !== "ticket" && !transaction) {
    return null
  }

  const selectClassName =
    "flex h-11 w-full rounded-[14px] border border-input bg-white px-3.5 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary"

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          aria-label={t("customers.ledger.corrections.edit")}
          className="h-8 w-8"
          size="icon"
          variant="ghost"
        >
          <PencilLine className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] w-[min(94vw,46rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("customers.ledger.corrections.editTitle")}</DialogTitle>
          <DialogDescription>
            {t("customers.ledger.corrections.editDescription")}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          <input name="customer_id" type="hidden" value={customerId} />

          {entry.entry_type === "ticket" && ticket ? (
            <>
              <input name="ticket_id" type="hidden" value={ticket.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`pnr-${entry.id}`}>{t("customers.ledger.corrections.fields.pnr")}</Label>
                  <Input id={`pnr-${entry.id}`} name="pnr" defaultValue={ticket.pnr} />
                  {getCorrectionError("pnr", state) ? (
                    <p className="text-sm text-red-600">{getCorrectionError("pnr", state)}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`ticket-number-${entry.id}`}>{t("customers.ledger.corrections.fields.ticketNumber")}</Label>
                  <Input
                    id={`ticket-number-${entry.id}`}
                    name="ticket_number"
                    defaultValue={ticket.ticket_number ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`airline-${entry.id}`}>{t("customers.ledger.corrections.fields.airline")}</Label>
                  <select
                    className={selectClassName}
                    id={`airline-${entry.id}`}
                    name="airline"
                    defaultValue={ticket.airline ?? ""}
                  >
                    <option value="">{t("manualDebts.form.chooseAirline")}</option>
                    {["VNA", "VJ", "QH", "VU"].map((airline) => (
                      <option key={airline} value={airline}>{airline}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`flight-date-${entry.id}`}>{t("customers.ledger.corrections.fields.flightDate")}</Label>
                  <Input
                    id={`flight-date-${entry.id}`}
                    name="flight_date"
                    type="datetime-local"
                    defaultValue={formatDateTimeLocal(ticket.flight_date)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`passengers-${entry.id}`}>{t("customers.ledger.corrections.fields.passengers")}</Label>
                <textarea
                  className="min-h-24 w-full rounded-[14px] border border-input bg-white px-3.5 py-2 text-sm shadow-[var(--shadow-sm)] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  id={`passengers-${entry.id}`}
                  name="passengers"
                  defaultValue={ticket.passengers.join("\n")}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`departure-place-${entry.id}`}>{t("customers.ledger.corrections.fields.departurePlace")}</Label>
                  <Input
                    id={`departure-place-${entry.id}`}
                    name="departure_place"
                    defaultValue={ticket.departure_place ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`arrival-place-${entry.id}`}>{t("customers.ledger.corrections.fields.arrivalPlace")}</Label>
                  <Input
                    id={`arrival-place-${entry.id}`}
                    name="arrival_place"
                    defaultValue={ticket.arrival_place ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`departure-code-${entry.id}`}>{t("customers.ledger.corrections.fields.departureCode")}</Label>
                  <Input
                    id={`departure-code-${entry.id}`}
                    name="departure_code"
                    defaultValue={ticket.departure_code ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`arrival-code-${entry.id}`}>{t("customers.ledger.corrections.fields.arrivalCode")}</Label>
                  <Input
                    id={`arrival-code-${entry.id}`}
                    name="arrival_code"
                    defaultValue={ticket.arrival_code ?? ""}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
                <div className="space-y-2">
                  <Label htmlFor={`net-price-${entry.id}`}>{t("customers.ledger.corrections.fields.netPrice")}</Label>
                  <Input
                    id={`net-price-${entry.id}`}
                    name="net_price"
                    type="number"
                    min="0"
                    defaultValue={ticket.net_price}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`ev-price-${entry.id}`}>{t("customers.ledger.corrections.fields.evPrice")}</Label>
                  <Input
                    id={`ev-price-${entry.id}`}
                    name="ev_price"
                    type="number"
                    min="0"
                    defaultValue={ticket.ev_price}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`ast-price-${entry.id}`}>{t("customers.ledger.corrections.fields.astPrice")}</Label>
                  <Input
                    id={`ast-price-${entry.id}`}
                    name="ast_price"
                    type="number"
                    min="0"
                    defaultValue={ticket.ast_price}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`thf-price-${entry.id}`}>{t("customers.ledger.corrections.fields.thfPrice")}</Label>
                  <Input
                    id={`thf-price-${entry.id}`}
                    name="thf_price"
                    type="number"
                    min="0"
                    defaultValue={ticket.thf_price}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`web-price-${entry.id}`}>{t("customers.ledger.corrections.fields.webPrice")}</Label>
                  <Input
                    id={`web-price-${entry.id}`}
                    name="web_price"
                    type="number"
                    min="0"
                    defaultValue={ticket.web_price}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`selling-price-${entry.id}`}>{t("customers.ledger.corrections.fields.sellingPrice")}</Label>
                  <Input
                    id={`selling-price-${entry.id}`}
                    name="selling_price"
                    type="number"
                    min="0"
                    defaultValue={ticket.selling_price}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`discount-${entry.id}`}>{t("customers.ledger.corrections.fields.discount")}</Label>
                  <Input
                    id={`discount-${entry.id}`}
                    name="discount"
                    type="number"
                    min="0"
                    defaultValue={ticket.discount}
                  />
                </div>
              </div>
            </>
          ) : transaction ? (
            <>
              <input name="transaction_id" type="hidden" value={transaction.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`amount-${entry.id}`}>{t("customers.ledger.corrections.fields.amount")}</Label>
                  <Input
                    id={`amount-${entry.id}`}
                    name="amount"
                    type="number"
                    min="1"
                    defaultValue={transaction.amount}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`occurred-at-${entry.id}`}>{t("customers.ledger.corrections.fields.occurredAt")}</Label>
                  <Input
                    id={`occurred-at-${entry.id}`}
                    name="occurred_at"
                    type="datetime-local"
                    defaultValue={formatDateTimeLocal(transaction.occurred_at)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`category-${entry.id}`}>{t("customers.ledger.corrections.fields.category")}</Label>
                  <select
                    className={selectClassName}
                    id={`category-${entry.id}`}
                    name="category"
                    defaultValue={transaction.category}
                  >
                    {transactionCategoryOptions.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`method-${entry.id}`}>{t("customers.ledger.corrections.fields.method")}</Label>
                  <Input
                    id={`method-${entry.id}`}
                    name="method"
                    defaultValue={transaction.method}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`note-${entry.id}`}>{t("customers.ledger.corrections.fields.note")}</Label>
                <textarea
                  className="min-h-24 w-full rounded-[14px] border border-input bg-white px-3.5 py-2 text-sm shadow-[var(--shadow-sm)] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  id={`note-${entry.id}`}
                  name="note"
                  defaultValue={transaction.note ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`evidence-${entry.id}`}>{t("customers.ledger.corrections.fields.evidence")}</Label>
                <Input
                  id={`evidence-${entry.id}`}
                  name="evidence_url"
                  defaultValue={transaction.evidence_url ?? ""}
                />
              </div>
            </>
          ) : null}

          {state.status === "error" && state.message ? (
            <p role="alert" className="text-sm text-red-600">{state.message}</p>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              {t("customers.management.dialogs.cancel")}
            </Button>
            <LedgerCorrectionSubmitButton
              idleLabel={t("customers.ledger.corrections.save")}
              pendingLabel={t("customers.ledger.corrections.saving")}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteLedgerRecordDialog({
  entry,
}: {
  entry: LedgerEntry
}) {
  const t = useI18n()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setErrorMessage(null)
    }
  }, [open])

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/ledger-records", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          record_id: entry.id,
          record_type: entry.entry_type === "ticket" ? "ticket" : "transaction",
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; detail?: string }
        | null

      if (response.status === 401) {
        expireStoredSession("unauthorized")
        router.replace(SESSION_EXPIRED_LOGIN_PATH)
        return
      }

      if (!response.ok) {
        const nextError =
          payload?.detail ?? payload?.error ?? t("customers.ledger.corrections.failure")
        setErrorMessage(nextError)
        toast.error(nextError)
        return
      }

      toast.success(t("customers.ledger.corrections.deleteSuccess"))
      setOpen(false)
      router.refresh()
    } catch {
      setErrorMessage(t("customers.ledger.corrections.failure"))
      toast.error(t("customers.ledger.corrections.failure"))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          aria-label={t("customers.ledger.corrections.delete")}
          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
          size="icon"
          variant="ghost"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,34rem)]">
        <DialogHeader>
          <DialogTitle>{t("customers.ledger.corrections.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("customers.ledger.corrections.deleteDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {entry.content.trim() || t("customers.ledger.fallbackContent")}
          </div>
          {errorMessage ? (
            <p role="alert" className="text-sm text-red-600">{errorMessage}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              disabled={isDeleting}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              {t("customers.management.dialogs.cancel")}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={handleDelete}
              type="button"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("customers.ledger.corrections.deleting")}
                </>
              ) : (
                t("customers.ledger.corrections.deleteConfirm")
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CustomerLedgerClient({
  currentUserRole,
  customerId,
  initialLedger,
}: CustomerLedgerClientProps) {
  const t = useI18n()
  const emptyLedger = React.useMemo<CustomerLedger>(
    () => ({
      customer: {
        id: customerId,
        name: "",
        type: "INDIVIDUAL",
        balance: 0,
        is_active: true,
        email: null,
        phone: null,
        address: null,
        tax_code: null,
      },
      current_balance: 0,
      balance_state: "settled",
      entries: [],
    }),
    [customerId],
  )
  const [confirmedLedger, setConfirmedLedger] = React.useState<CustomerLedger>(
    () => cloneLedgerState(initialLedger ?? emptyLedger),
  )

  React.useEffect(() => {
    if (initialLedger) {
      setConfirmedLedger(cloneLedgerState(initialLedger))
      return
    }

    setConfirmedLedger(cloneLedgerState(emptyLedger))
  }, [emptyLedger, initialLedger])

  const [optimisticLedger, addOptimisticPayment] = React.useOptimistic<
    CustomerLedger,
    { amount: number; note: string }
  >(
    confirmedLedger,
    (ledger, payment) => applyOptimisticPaymentToLedger(ledger, payment),
  )

  const handleOptimisticSubmit = React.useCallback(
    (payment: { amount: number; note: string }) => {
      React.startTransition(() => {
        addOptimisticPayment(payment)
      })
    },
    [addOptimisticPayment],
  )

  const handleActionSettled = React.useCallback((status: "success" | "error") => {
    if (status === "error") {
      setConfirmedLedger((currentLedger) => cloneLedgerState(currentLedger))
    }
  }, [])

  if (!initialLedger) {
    return (
      <Panel>
        <PanelHeaderRow
          eyebrow={t("customers.ledger.eyebrow")}
          title={t("customers.ledger.unavailableTitle")}
          description={t("customers.ledger.unavailableDescription")}
        />
      </Panel>
    )
  }

  const ledger = optimisticLedger
  const currentBalanceInWords = convert_number_to_vn_words(
    Math.abs(ledger.current_balance),
  )
  const ticketOptions = confirmedLedger.entries
    .filter((entry) => entry.entry_type === "ticket" && entry.ticket)
    .map((entry) => ({
      id: entry.ticket?.id ?? entry.id,
      label: entry.content.trim() || entry.id,
    }))
  const hasRowActions = currentUserRole === "ADMIN" || ledger.customer.is_active
  const balanceStateLabels = {
    debt: t("customers.ledger.balanceStates.debt"),
    settled: t("customers.ledger.balanceStates.settled"),
    credit: t("customers.ledger.balanceStates.credit"),
  } as const
  const customerStatusLabel = ledger.customer.is_active
    ? t("customers.management.statuses.active")
    : t("customers.management.statuses.archived")

  const getEntryTypeLabel = (
    entryType: CustomerLedger["entries"][number]["entry_type"],
  ): string => {
    if (entryType === "ticket") {
      return t("customers.ledger.entryTypes.ticket")
    }

    if (entryType === "adjustment") {
      return t("customers.ledger.entryTypes.adjustment")
    }

    return t("customers.ledger.entryTypes.payment")
  }

  return (
    <div className="space-y-4 text-foreground">
      <Panel>
        <PanelHeaderRow
          eyebrow={t("customers.ledger.eyebrow")}
          title={ledger.customer.name}
          description={`${t("customers.ledger.customerId")}: ${ledger.customer.id}`}
          action={
            <div className="flex flex-wrap justify-end gap-2">
              {currentUserRole === "ADMIN" ? (
                <EditCustomerDialog customer={ledger.customer} />
              ) : null}
              {currentUserRole === "ADMIN" ? (
                <ToggleCustomerStatusButton customer={ledger.customer} />
              ) : null}
              <PaymentDialog
                customerId={customerId}
                disabled={!ledger.customer.is_active}
                onOptimisticSubmit={handleOptimisticSubmit}
                onSettled={handleActionSettled}
                ticketOptions={ticketOptions}
              />
            </div>
          }
        />
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t("customers.ledger.currentBalance")}
              </p>
              <p className="mt-2 text-2xl font-medium text-foreground">
                {formatCurrency(Math.abs(ledger.current_balance))}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t("customers.management.fields.status")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusChip
                  tone={
                    ledger.balance_state === "debt"
                      ? "danger"
                      : ledger.balance_state === "credit"
                        ? "info"
                        : "success"
                  }
                >
                  {balanceStateLabels[ledger.balance_state]}
                </StatusChip>
                <StatusChip tone={ledger.customer.is_active ? "success" : "warning"}>
                  {customerStatusLabel}
                </StatusChip>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t("customers.ledger.entryCount")}
              </p>
              <p className="mt-2 text-2xl font-medium text-foreground">
                {ledger.entries.length}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("customers.ledger.amountInWords")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {currentBalanceInWords}
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeaderRow
          title={t("customers.ledger.tableTitle")}
          description={t("customers.ledger.tableDescription")}
        />
        <TableScrollArea>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/55 hover:bg-secondary/55">
                <TableHead>{t("customers.ledger.columns.date")}</TableHead>
                <TableHead>{t("customers.ledger.columns.type")}</TableHead>
                <TableHead>{t("customers.ledger.columns.content")}</TableHead>
                <TableHead className="text-right">
                  {t("customers.ledger.columns.amount")}
                </TableHead>
                <TableHead className="text-right">
                  {t("customers.ledger.columns.balance")}
                </TableHead>
                {hasRowActions ? (
                  <TableHead className="text-right">
                    {t("customers.ledger.columns.actions")}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-12 text-center text-muted-foreground"
                    colSpan={hasRowActions ? 6 : 5}
                  >
                    {t("customers.ledger.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                ledger.entries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-accent/40">
                    <TableCell className="whitespace-nowrap px-6 py-5 text-sm text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <StatusChip
                        tone={
                          entry.entry_type === "ticket"
                            ? "warning"
                            : entry.entry_type === "adjustment"
                              ? "neutral"
                              : "info"
                        }
                      >
                        {getEntryTypeLabel(entry.entry_type)}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      {entry.entry_type === "ticket" && entry.ticket ? (
                        <Link
                          className="inline-flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
                          href={`/tickets/${entry.ticket.id}`}
                        >
                          <span>
                            {entry.content.trim() ||
                              t("customers.ledger.fallbackContent")}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <p className="font-medium text-foreground">
                          {entry.content.trim() || t("customers.ledger.fallbackContent")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-6 py-5 text-right font-semibold",
                        entry.amount > 0
                          ? "text-foreground"
                          : entry.amount < 0
                            ? "text-primary"
                            : "text-muted-foreground",
                      )}
                    >
                      {formatSignedCurrency(entry.amount)}
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right font-medium text-foreground">
                      {formatCurrency(entry.running_balance)}
                    </TableCell>
                    {hasRowActions ? (
                      <TableCell className="px-6 py-5 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <PaymentDialog
                            customerId={customerId}
                            defaultLinkedTicketId={entry.ticket?.id ?? ""}
                            disabled={!ledger.customer.is_active}
                            onOptimisticSubmit={handleOptimisticSubmit}
                            onSettled={handleActionSettled}
                            ticketOptions={ticketOptions}
                            triggerLabel={t("customers.ledger.paymentDialog.rowAction")}
                            triggerSize="sm"
                            triggerVariant="outline"
                          />
                          {currentUserRole === "ADMIN" ? (
                            <>
                              <LedgerRecordCorrectionDialog
                                customerId={customerId}
                                entry={entry}
                              />
                              <DeleteLedgerRecordDialog
                                entry={entry}
                              />
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableScrollArea>
      </Panel>
    </div>
  )
}
