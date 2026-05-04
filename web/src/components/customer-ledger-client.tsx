"use client"

import * as React from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2, PencilLine } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  toggleCustomerActiveAction,
  updateCustomerAction,
} from "@/actions/customer-management"
import { PaymentDialog } from "@/components/payment-dialog"
import {
  CommandPanel,
  CommandPanelHeader,
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
  const day = value.getDate().toString().padStart(2, "0")
  const month = (value.getMonth() + 1).toString().padStart(2, "0")
  const year = value.getFullYear()
  const hours = value.getHours().toString().padStart(2, "0")
  const minutes = value.getMinutes().toString().padStart(2, "0")

  return `${day}/${month}/${year} ${hours}:${minutes}`
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
  const [isActive, setIsActive] = React.useState(customer.is_active)
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
      setIsActive(customer.is_active)
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

            <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="space-y-2">
                <Label htmlFor="customer-status">
                  {t("customers.management.fields.status")}
                </Label>
                <select
                  className={selectClassName}
                  id="customer-status"
                  name="is_active"
                  onChange={(event) => setIsActive(event.target.value === "true")}
                  value={String(isActive)}
                >
                  <option value="true">{t("customers.management.statuses.active")}</option>
                  <option value="false">{t("customers.management.statuses.archived")}</option>
                </select>
                {getCustomerFieldError("is_active", clientErrors, state) ? (
                  <p className="text-sm text-red-600">
                    {getCustomerFieldError("is_active", clientErrors, state)}
                  </p>
                ) : null}
              </div>
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
            ? t("customers.management.archiveAction")
            : t("customers.management.reactivateAction")
        }
        pendingLabel={t("customers.management.toggleSubmitting")}
        variant="outline"
      />
    </form>
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
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("customers.ledger.eyebrow")}
          title={t("customers.ledger.unavailableTitle")}
          description={t("customers.ledger.unavailableDescription")}
        />
      </CommandPanel>
    )
  }

  const ledger = optimisticLedger
  const currentBalanceInWords = convert_number_to_vn_words(
    Math.abs(ledger.current_balance),
  )
  const ticketOptions = confirmedLedger.entries
    .filter((entry) => entry.entry_type === "ticket")
    .map((entry) => ({
      id: entry.id,
      label: entry.content.trim() || entry.id,
    }))
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
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("customers.ledger.eyebrow")}
          title={ledger.customer.name}
          description={`${t("customers.ledger.customerId")}: ${ledger.customer.id}`}
          action={
            <div className="flex flex-wrap justify-end gap-2">
              <EditCustomerDialog customer={ledger.customer} />
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
      </CommandPanel>

      <CommandPanel>
        <CommandPanelHeader
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.entries.length === 0 ? (
                <TableRow>
                  <TableCell className="py-12 text-center text-muted-foreground" colSpan={5}>
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
                      <p className="font-medium text-foreground">
                        {entry.content.trim() || t("customers.ledger.fallbackContent")}
                      </p>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableScrollArea>
      </CommandPanel>
    </div>
  )
}
