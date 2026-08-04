"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { Banner } from "@astryxdesign/core/Banner"
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog"
import { Layout, LayoutContent } from "@astryxdesign/core/Layout"
import { Tooltip } from "@astryxdesign/core/Tooltip"
import { useRouter } from "next/navigation"
import { useFormStatus } from "react-dom"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleDollarSign,
  Info,
  Pencil,
  Loader2,
  Plus,
  ReceiptText,
  Route,
  Search,
  Trash2,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

import {
  deleteManualDebtRowAction,
  updateManualDebtRowAction,
} from "@/actions/manual-debt"
import {
  EmptyState,
  Panel,
} from "@/components/command-center"
import { selectInputClassName, TableStateRow } from "@/components/operations-ui"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { expireStoredSession } from "@/lib/auth-storage"
import { SESSION_EXPIRED_LOGIN_PATH } from "@/lib/auth-token"
import {
  formatCurrency,
  formatCurrencyInput,
  formatSignedCurrencyInput,
  parseCurrencyInput,
  parseSignedCurrencyInput,
} from "@/lib/formatters"
import { apiFetchData } from "@/lib/api"
import type {
  LedgerReportRow,
  TicketDebtReportPage,
} from "@/lib/server-report"
import { cn } from "@/lib/utils"
import {
  AIRLINE_LABELS,
  createManualDebtRowUpdateSchema,
  getManualDebtRowUpdateValidationMessages,
  initialManualDebtActionState,
  initialManualDebtRowUpdateActionState,
  paymentMethodOptions,
  type Airline,
  type CustomerDirectoryItem,
  type CustomerDirectoryPage,
  type ManualDebtActionState,
  type ManualDebtFormValues,
  type ManualDebtRowUpdateFormValues,
  type PaymentMethod,
} from "@/schemas"
import { useI18n } from "@/locales/client"
import styles from "./manual-debt-input.module.css"

type ManualDebtInputClientProps = {
  customers: CustomerDirectoryItem[]
  initialPage: TicketDebtReportPage
}

type ManualDebtField = keyof ManualDebtFormValues
type TableView = "summary" | "full"
type SortDirection = "asc" | "desc"
type SortKey =
  | "bookedAt"
  | "description"
  | "createdAt"
  | "customerPaid"
  | "discount"
  | "evPrice"
  | "astPrice"
  | "thfPrice"
  | "webPrice"
  | "insurancePrice"
  | "income"
  | "paymentAmount"
  | "paymentMethod"

type SortState = {
  key: SortKey
  direction: SortDirection
}

const airlineOptions = Object.entries(AIRLINE_LABELS) as [Airline, string][]

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

function formatOptionalDate(value: string | null | undefined): string {
  return value ? formatDate(value) : ""
}

function getLocalDateToday(): string {
  return formatDateInputValue(new Date())
}

function formatDateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const getPart = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? ""

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`
}

function formatDateLocal(value: string | null | undefined): string {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return formatDateInputValue(date)
}

function formatDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ""

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}`
}

function getFieldError(
  fieldErrors: Partial<Record<ManualDebtField, string>>,
  field: ManualDebtField,
): string | undefined {
  return fieldErrors[field]
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
}

function getRowPaymentMethod(row: LedgerReportRow): string {
  if (row.linked_payment_methods.length > 0) {
    return row.linked_payment_methods.join(", ")
  }

  return paymentMethodOptions.includes(row.transaction_method as PaymentMethod)
    ? row.transaction_method ?? ""
    : ""
}

function getRowSortValue(
  row: LedgerReportRow,
  sortKey: SortKey,
): number | string | null {
  switch (sortKey) {
    case "bookedAt":
      return row.booked_at ? new Date(row.booked_at).getTime() : null
    case "description":
      return `${row.passenger_names} ${row.customer_name}`.trim()
    case "createdAt":
      return new Date(row.created_at).getTime()
    case "customerPaid":
      return row.ticket_selling_price
    case "discount":
      return row.ticket_discount
    case "evPrice":
      return row.ticket_ev_price
    case "astPrice":
      return row.ticket_ast_price
    case "thfPrice":
      return row.ticket_thf_price
    case "webPrice":
      return row.ticket_web_price
    case "insurancePrice":
      return row.ticket_insurance_price
    case "income":
      return row.ticket_true_income
    case "paymentAmount":
      return row.linked_payment_amount
    case "paymentMethod":
      return getRowPaymentMethod(row)
  }
}

function compareSortValues(
  first: number | string | null,
  second: number | string | null,
): number {
  const firstEmpty = first === null || first === ""
  const secondEmpty = second === null || second === ""

  if (firstEmpty || secondEmpty) {
    if (firstEmpty && secondEmpty) {
      return 0
    }

    return firstEmpty ? 1 : -1
  }

  if (typeof first === "number" && typeof second === "number") {
    return first - second
  }

  return String(first).localeCompare(String(second), "vi", {
    numeric: true,
    sensitivity: "base",
  })
}

function getDefaultSortDirection(sortKey: SortKey): SortDirection {
  return sortKey === "description" || sortKey === "paymentMethod"
    ? "asc"
    : "desc"
}

function FormField({
  children,
  error,
  isRequired = false,
  label,
  htmlFor,
}: {
  children: React.ReactNode
  error?: string
  isRequired?: boolean
  label: string
  htmlFor: string
}) {
  return (
    <div className={patterns.fieldStack}>
      <Label
        className={patterns.eyebrow}
        htmlFor={htmlFor}
      >
        {label}
        {isRequired ? (
          <span aria-hidden="true" className={styles.requiredMark}>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function CustomerAutocomplete({
  customers,
  id,
  name,
  noResultsLabel,
  placeholder,
  required = false,
}: {
  customers: CustomerDirectoryItem[]
  id: string
  name: string
  noResultsLabel: string
  placeholder: string
  required?: boolean
}) {
  const listboxId = React.useId()
  const [value, setValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [remoteCustomers, setRemoteCustomers] = React.useState<
    CustomerDirectoryItem[] | null
  >(null)

  React.useEffect(() => {
    const normalizedValue = value.trim()

    if (!normalizedValue) {
      setRemoteCustomers(null)
      return
    }

    const timeoutId = window.setTimeout(() => {
      void apiFetchData<CustomerDirectoryPage>(
        `/customers?page=1&page_size=20&q=${encodeURIComponent(normalizedValue)}`,
      )
        .then((page) => setRemoteCustomers(page.items))
        .catch(() => setRemoteCustomers([]))
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [value])

  const matchingCustomers = React.useMemo(() => {
    const normalizedValue = normalizeSearch(value)
    const source = normalizedValue
      ? (remoteCustomers ?? customers).filter((customer) => {
          const normalizedName = normalizeSearch(customer.full_name)
          const normalizedPhone = normalizeSearch(customer.phone ?? "")

          return (
            normalizedName.includes(normalizedValue) ||
            normalizedPhone.includes(normalizedValue)
          )
        })
      : customers

    return source.slice(0, 8)
  }, [customers, remoteCustomers, value])

  const hasMatches = matchingCustomers.length > 0

  const selectCustomer = (customer: CustomerDirectoryItem) => {
    setValue(customer.full_name)
    setIsOpen(false)
    setActiveIndex(0)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      setIsOpen(true)
      return
    }

    if (!isOpen) {
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setIsOpen(false)
      return
    }

    if (!hasMatches) {
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % matchingCustomers.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex(
        (current) =>
          (current - 1 + matchingCustomers.length) % matchingCustomers.length,
      )
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      selectCustomer(matchingCustomers[activeIndex])
    }
  }

  return (
    <div className={patterns.relative}>
      <Input
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        autoComplete="off"
        id={id}
        name={name}
        onBlur={() => setIsOpen(false)}
        onChange={(event) => {
          setValue(event.target.value)
          setIsOpen(true)
          setActiveIndex(0)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        required={required}
        value={value}
      />
      <ChevronsUpDown
        aria-hidden="true"
        className={styles.comboIcon}
      />
      {isOpen ? (
        <div
          className={styles.listbox}
          id={listboxId}
          role="listbox"
        >
          {hasMatches ? (
            matchingCustomers.map((customer, index) => (
              <button
                aria-selected={index === activeIndex}
                className={cn(
                  styles.option,
                  index === activeIndex && styles.optionActive,
                )}
                key={customer.id}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectCustomer(customer)
                }}
                role="option"
                type="button"
              >
                <span className={patterns.minWidthZero}>
                  <span className={styles.optionName}>
                    {customer.full_name}
                  </span>
                  {customer.phone ? (
                    <span className={styles.optionPhone}>
                      {customer.phone}
                    </span>
                  ) : null}
                </span>
                <span className={styles.optionMeta}>
                  {formatCurrency(customer.current_balance)}
                </span>
              </button>
            ))
          ) : (
            <div className={styles.noResults}>
              {noResultsLabel}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function AirlineAutocomplete({
  id,
  name,
  noResultsLabel,
  placeholder,
}: {
  id: string
  name: string
  noResultsLabel: string
  placeholder: string
}) {
  const listboxId = React.useId()
  const [value, setValue] = React.useState("")
  const [selectedCode, setSelectedCode] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)

  const matchingAirlines = React.useMemo(() => {
    const normalizedValue = normalizeSearch(value)
    const source = normalizedValue
      ? airlineOptions.filter(([code, label]) => {
          const normalizedCode = normalizeSearch(code)
          const normalizedLabel = normalizeSearch(label)

          return (
            normalizedCode.includes(normalizedValue) ||
            normalizedLabel.includes(normalizedValue)
          )
        })
      : airlineOptions

    return source
  }, [value])

  const hasMatches = matchingAirlines.length > 0

  const getExactAirline = React.useCallback((nextValue: string) => {
    const normalizedValue = normalizeSearch(nextValue)

    if (!normalizedValue) {
      return undefined
    }

    return airlineOptions.find(([code, label]) => {
      const normalizedCode = normalizeSearch(code)
      const normalizedLabel = normalizeSearch(label)
      const normalizedDisplay = normalizeSearch(`${code} - ${label}`)

      return (
        normalizedValue === normalizedCode ||
        normalizedValue === normalizedLabel ||
        normalizedValue === normalizedDisplay
      )
    })
  }, [])

  const selectAirline = React.useCallback((code: Airline, label: string) => {
    setValue(`${code} - ${label}`)
    setSelectedCode(code)
    setIsOpen(false)
    setActiveIndex(0)
  }, [])

  const reconcileTypedValue = React.useCallback(() => {
    if (!normalizeSearch(value)) {
      setSelectedCode("")
      setValue("")
      return
    }

    const exactMatch = getExactAirline(value)

    if (exactMatch) {
      selectAirline(exactMatch[0], exactMatch[1])
    } else {
      setSelectedCode("")
    }
  }, [getExactAirline, selectAirline, value])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      setIsOpen(true)
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setIsOpen(false)
      return
    }

    if (!isOpen || !hasMatches) {
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % matchingAirlines.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex(
        (current) =>
          (current - 1 + matchingAirlines.length) % matchingAirlines.length,
      )
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const [code, label] = matchingAirlines[activeIndex]
      selectAirline(code, label)
    }
  }

  return (
    <div className={patterns.relative}>
      <input name={name} readOnly type="hidden" value={selectedCode} />
      <Input
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        autoComplete="off"
        id={id}
        onBlur={() => {
          window.setTimeout(() => {
            reconcileTypedValue()
            setIsOpen(false)
          }, 0)
        }}
        onChange={(event) => {
          const nextValue = event.target.value
          const exactMatch = getExactAirline(nextValue)

          setValue(nextValue)
          setSelectedCode(exactMatch?.[0] ?? "")
          setIsOpen(true)
          setActiveIndex(0)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        value={value}
      />
      <ChevronsUpDown
        aria-hidden="true"
        className={styles.comboIcon}
      />
      {isOpen ? (
        <div
          className={styles.listbox}
          id={listboxId}
          role="listbox"
        >
          {hasMatches ? (
            matchingAirlines.map(([code, label], index) => (
              <button
                aria-selected={index === activeIndex}
                className={cn(
                  styles.option,
                  index === activeIndex && styles.optionActive,
                )}
                key={code}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectAirline(code, label)
                }}
                role="option"
                type="button"
              >
                <span className={patterns.labelText}>{label}</span>
                <span className={styles.optionCode}>
                  {code}
                </span>
              </button>
            ))
          ) : (
            <div className={styles.noResults}>
              {noResultsLabel}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function SubmitButton({
  onSubmit,
  pending,
}: {
  onSubmit: () => void
  pending: boolean
}) {
  const t = useI18n()

  return (
    <Button
      className={styles.submitButton}
      disabled={pending}
      onClick={onSubmit}
      type="button"
    >
      {pending ? <Loader2 className={`${patterns.iconSmall} ${patterns.spinner}`} /> : <Plus className={patterns.iconSmall} />}
      {pending ? t("manualDebts.actions.saving") : t("manualDebts.actions.save")}
    </Button>
  )
}

function FormSection({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
}) {
  return (
    <div className={styles.formSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>
          <Icon aria-hidden="true" className={patterns.iconSmall} />
        </span>
        <p className={patterns.accentEyebrow}>
          {title}
        </p>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function DetailItem({
  label,
  value,
  numeric = false,
}: {
  label: string
  value: React.ReactNode
  numeric?: boolean
}) {
  return (
    <div className={styles.detailItem}>
      <dt className={styles.detailLabel}>{label}</dt>
      <dd className={cn(styles.detailValue, numeric && styles.detailNumber)}>
        {value}
      </dd>
    </div>
  )
}

type EditablePricingField =
  | "net_price"
  | "selling_price"
  | "discount"
  | "ev_price"
  | "ast_price"
  | "thf_price"
  | "web_price"
  | "insurance_price"

type EditablePricingValues = Record<EditablePricingField, number>
type RowUpdateErrors = Partial<
  Record<keyof ManualDebtRowUpdateFormValues, string>
>

const editablePricingFields: EditablePricingField[] = [
  "ev_price",
  "ast_price",
  "thf_price",
  "web_price",
  "insurance_price",
  "selling_price",
  "discount",
  "net_price",
]

function getEditablePricingValues(row: LedgerReportRow): EditablePricingValues {
  return {
    net_price: row.ticket_net_price,
    selling_price: row.ticket_selling_price,
    discount: row.ticket_discount,
    ev_price: row.ticket_ev_price,
    ast_price: row.ticket_ast_price,
    thf_price: row.ticket_thf_price,
    web_price: row.ticket_web_price,
    insurance_price: row.ticket_insurance_price,
  }
}

function getEditablePaymentMethod(row: LedgerReportRow): PaymentMethod | "" {
  if (row.linked_payment_methods.length === 1) {
    const linkedMethod = row.linked_payment_methods[0]
    return paymentMethodOptions.includes(linkedMethod as PaymentMethod)
      ? (linkedMethod as PaymentMethod)
      : ""
  }

  if (row.linked_payment_methods.length > 1) {
    return ""
  }

  return paymentMethodOptions.includes(row.transaction_method as PaymentMethod)
    ? (row.transaction_method as PaymentMethod)
    : ""
}

function getPaymentTransactionIds(row: LedgerReportRow): string[] {
  if (row.linked_payment_transaction_ids.length > 0) {
    return row.linked_payment_transaction_ids
  }

  return row.transaction_id ? [row.transaction_id] : []
}

function RowEditSubmitButton() {
  const t = useI18n()
  const { pending } = useFormStatus()

  return (
    <Button className={styles.submitButton} disabled={pending} type="submit">
      {pending ? (
        <Loader2 className={`${patterns.iconSmall} ${patterns.spinner}`} />
      ) : null}
      {pending
        ? t("manualDebts.table.actions.saving")
        : t("manualDebts.table.actions.saveChanges")}
    </Button>
  )
}

function CurrencyEditField({
  error,
  id,
  label,
  name,
  onChange,
  signed = false,
  value,
}: {
  error?: string
  id: string
  label: string
  name: EditablePricingField | "true_income" | "payment_amount"
  onChange: (value: number) => void
  signed?: boolean
  value: number
}) {
  return (
    <FormField error={error} htmlFor={id} label={label}>
      <Input
        className={styles.editorMoneyInput}
        id={id}
        inputMode={signed ? "decimal" : "numeric"}
        name={name}
        onChange={(event) =>
          onChange(
            signed
              ? parseSignedCurrencyInput(event.target.value)
              : parseCurrencyInput(event.target.value),
          )
        }
        type="text"
        value={
          signed
            ? formatSignedCurrencyInput(value)
            : formatCurrencyInput(value)
        }
      />
    </FormField>
  )
}

function EditorTextField({
  defaultValue,
  error,
  id,
  label,
  maxLength,
  name,
}: {
  defaultValue: string
  error?: string
  id: string
  label: string
  maxLength?: number
  name: string
}) {
  return (
    <FormField error={error} htmlFor={id} label={label}>
      <Input
        defaultValue={defaultValue}
        id={id}
        maxLength={maxLength}
        name={name}
        type="text"
      />
    </FormField>
  )
}

function ManualDebtEditorDrawer({
  onOpenChange,
  row,
}: {
  onOpenChange: (open: boolean) => void
  row: LedgerReportRow | null
}) {
  return (
    <Dialog
      className={cn(styles.sideDrawer, styles.editorDrawer)}
      isOpen={row !== null}
      maxHeight="100dvh"
      onOpenChange={onOpenChange}
      padding={0}
      position={{ bottom: 0, right: 0, top: 0 }}
      purpose="info"
      width="min(32rem, 100dvw)"
    >
      {row ? (
        <ManualDebtEditorForm
          key={row.id}
          onOpenChange={onOpenChange}
          row={row}
        />
      ) : null}
    </Dialog>
  )
}

function ManualDebtEditorForm({
  onOpenChange,
  row,
}: {
  onOpenChange: (open: boolean) => void
  row: LedgerReportRow
}) {
  const t = useI18n()
  const router = useRouter()
  const initialPricing = React.useMemo(() => getEditablePricingValues(row), [row])
  const paymentTransactionIds = React.useMemo(
    () => getPaymentTransactionIds(row),
    [row],
  )
  const [pricing, setPricing] = React.useState(initialPricing)
  const [manualIncome, setManualIncome] = React.useState(row.ticket_true_income)
  const [isIncomeOverridden, setIsIncomeOverridden] = React.useState(false)
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod | "">(
    getEditablePaymentMethod(row),
  )
  const [paymentNote, setPaymentNote] = React.useState(
    row.linked_payment_note?.trim() ?? "",
  )
  const [paymentAmount, setPaymentAmount] = React.useState(
    row.linked_payment_amount ?? 0,
  )
  const [paymentOccurredAt, setPaymentOccurredAt] = React.useState(
    formatDateLocal(row.linked_payment_occurred_at),
  )
  const [clientErrors, setClientErrors] = React.useState<RowUpdateErrors>({})
  const [clientMessage, setClientMessage] = React.useState<string | null>(null)
  const [state, formAction] = React.useActionState(
    updateManualDebtRowAction,
    initialManualDebtRowUpdateActionState,
  )
  const schema = React.useMemo(
    () =>
      createManualDebtRowUpdateSchema(
        getManualDebtRowUpdateValidationMessages((key) => t(key)),
      ),
    [t],
  )
  const paymentMethodLabels: Record<PaymentMethod, string> = {
    "Chuyển khoản": t(
      "customers.ledger.paymentDialog.fields.methodOptions.bankTransfer",
    ),
    "Tiền mặt": t("customers.ledger.paymentDialog.fields.methodOptions.cash"),
    AST: t("customers.ledger.paymentDialog.fields.methodOptions.ast"),
    THF: t("customers.ledger.paymentDialog.fields.methodOptions.thf"),
  }
  const hasPricingChanged = editablePricingFields.some(
    (field) => pricing[field] !== initialPricing[field],
  )
  const calculatedIncome =
    pricing.selling_price +
    pricing.discount -
    (pricing.ev_price +
      pricing.ast_price +
      pricing.thf_price +
      pricing.web_price +
      pricing.insurance_price)
  const displayedIncome = isIncomeOverridden
    ? manualIncome
    : hasPricingChanged
      ? calculatedIncome
      : row.ticket_true_income
  const canEditPayment = paymentTransactionIds.length > 0
  const canEditLinkedPayment = row.linked_payment_transaction_ids.length === 1
  const originalPaymentMethod = getEditablePaymentMethod(row)
  const originalPaymentNote = row.linked_payment_note?.trim() ?? ""
  const originalPaymentAmount = row.linked_payment_amount ?? 0
  const originalPaymentOccurredAt = formatDateLocal(
    row.linked_payment_occurred_at,
  )
  const feedbackMessage =
    clientMessage ?? (state.status === "error" ? state.message : null)

  const getError = (
    field: keyof ManualDebtRowUpdateFormValues,
  ): string | undefined => clientErrors[field] ?? state.fieldErrors[field]

  const updatePricing = (field: EditablePricingField, value: number) => {
    setPricing((current) => ({ ...current, [field]: value }))
  }

  React.useEffect(() => {
    if (state.status !== "success") {
      return
    }

    toast.success(
      state.message ?? t("manualDebts.table.actions.updateSuccess"),
    )
    router.refresh()
    onOpenChange(false)
  }, [onOpenChange, router, state.message, state.status, state.submittedAt, t])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget)
    const parsedInput = schema.safeParse({
      customer_id: formData.get("customer_id"),
      ticket_id: formData.get("ticket_id"),
      pnr: formData.get("pnr"),
      airline: formData.get("airline"),
      ticket_number: formData.get("ticket_number"),
      booked_at: formData.get("booked_at") || null,
      passengers: formData.get("passengers"),
      itinerary: formData.get("itinerary"),
      flight_date: formData.get("flight_date"),
      net_price: formData.get("net_price"),
      selling_price: formData.get("selling_price"),
      discount: formData.get("discount"),
      ev_price: formData.get("ev_price"),
      ast_price: formData.get("ast_price"),
      thf_price: formData.get("thf_price"),
      web_price: formData.get("web_price"),
      insurance_price: formData.get("insurance_price"),
      true_income: formData.get("true_income"),
      true_income_override: formData.get("true_income_override"),
      payment_method: formData.get("payment_method"),
      payment_method_changed: formData.get("payment_method_changed"),
      payment_amount: formData.get("payment_amount"),
      payment_amount_changed: formData.get("payment_amount_changed"),
      payment_occurred_at: formData.get("payment_occurred_at"),
      payment_occurred_at_changed: formData.get(
        "payment_occurred_at_changed",
      ),
      payment_note: formData.get("payment_note"),
      payment_note_changed: formData.get("payment_note_changed"),
      payment_transaction_ids: formData.getAll("payment_transaction_id"),
    })

    if (!parsedInput.success) {
      event.preventDefault()
      const errors = parsedInput.error.flatten().fieldErrors
      setClientErrors({
        pnr: errors.pnr?.[0],
        airline: errors.airline?.[0],
        ticket_number: errors.ticket_number?.[0],
        booked_at: errors.booked_at?.[0],
        passengers: errors.passengers?.[0],
        itinerary: errors.itinerary?.[0],
        flight_date: errors.flight_date?.[0],
        net_price: errors.net_price?.[0],
        selling_price: errors.selling_price?.[0],
        discount: errors.discount?.[0],
        ev_price: errors.ev_price?.[0],
        ast_price: errors.ast_price?.[0],
        thf_price: errors.thf_price?.[0],
        web_price: errors.web_price?.[0],
        insurance_price: errors.insurance_price?.[0],
        true_income: errors.true_income?.[0],
        payment_method: errors.payment_method?.[0],
        payment_amount: errors.payment_amount?.[0],
        payment_occurred_at: errors.payment_occurred_at?.[0],
        payment_note: errors.payment_note?.[0],
      })
      setClientMessage(t("manualDebts.table.actions.invalidUpdate"))
      return
    }

    setClientErrors({})
    setClientMessage(null)
  }

  return (
    <form
      action={formAction}
      className={styles.editorForm}
      onChange={() => {
        setClientErrors({})
        setClientMessage(null)
      }}
      onSubmit={handleSubmit}
    >
      <input name="customer_id" type="hidden" value={row.customer_id} />
      <input name="ticket_id" type="hidden" value={row.ticket_id ?? ""} />
      <input
        name="true_income_override"
        type="hidden"
        value={isIncomeOverridden || !hasPricingChanged ? "true" : "false"}
      />
      <input
        name="payment_method_changed"
        type="hidden"
        value={paymentMethod === originalPaymentMethod ? "false" : "true"}
      />
      <input
        name="payment_amount_changed"
        type="hidden"
        value={
          canEditLinkedPayment && paymentAmount !== originalPaymentAmount
            ? "true"
            : "false"
        }
      />
      <input
        name="payment_occurred_at_changed"
        type="hidden"
        value={
          canEditLinkedPayment && paymentOccurredAt !== originalPaymentOccurredAt
            ? "true"
            : "false"
        }
      />
      <input
        name="payment_note_changed"
        type="hidden"
        value={paymentNote.trim() === originalPaymentNote ? "false" : "true"}
      />
      {paymentTransactionIds.map((transactionId) => (
        <input
          key={transactionId}
          name="payment_transaction_id"
          type="hidden"
          value={transactionId}
        />
      ))}

      <Layout
        className={styles.drawerLayout}
        defaultHasDividers
        header={
          <DialogHeader
            className={styles.drawerHeader}
            endContent={<RowEditSubmitButton />}
            onOpenChange={onOpenChange}
            subtitle={row.customer_name}
            title={t("manualDebts.table.editTitle")}
          />
        }
        content={
          <LayoutContent className={styles.editorDrawerContent} padding={0}>
            <div className={styles.editorBody}>
              {feedbackMessage ? (
                <Banner status="error" title={feedbackMessage} />
              ) : null}

              <FormSection
                icon={ReceiptText}
                title={t("manualDebts.table.groups.record")}
              >
                <div className={styles.editorSectionContent}>
                  <dl className={styles.detailGrid}>
                    <DetailItem
                      label={t("manualDebts.table.columns.customer")}
                      value={row.customer_name}
                    />
                  </dl>

                  <FormField
                    error={getError("booked_at")}
                    htmlFor={`edit-booked-at-${row.id}`}
                    label={t("manualDebts.form.fields.bookedAt")}
                  >
                    <Input
                      defaultValue={formatDateLocal(row.booked_at)}
                      id={`edit-booked-at-${row.id}`}
                      name="booked_at"
                      type="date"
                    />
                  </FormField>

                  <FormField
                    error={getError("passengers")}
                    htmlFor={`edit-passengers-${row.id}`}
                    label={t("manualDebts.form.fields.passengers")}
                  >
                    <Textarea
                      defaultValue={row.passenger_names}
                      id={`edit-passengers-${row.id}`}
                      name="passengers"
                      rows={2}
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection
                icon={CircleDollarSign}
                title={t("manualDebts.form.pricingGroup")}
              >
                <div className={patterns.twoColumnGrid}>
                  <CurrencyEditField
                    error={getError("ev_price")}
                    id={`edit-ev-price-${row.id}`}
                    label={t("manualDebts.form.fields.evPrice")}
                    name="ev_price"
                    onChange={(value) => updatePricing("ev_price", value)}
                    value={pricing.ev_price}
                  />
                  <CurrencyEditField
                    error={getError("ast_price")}
                    id={`edit-ast-price-${row.id}`}
                    label={t("manualDebts.form.fields.astPrice")}
                    name="ast_price"
                    onChange={(value) => updatePricing("ast_price", value)}
                    value={pricing.ast_price}
                  />
                  <CurrencyEditField
                    error={getError("thf_price")}
                    id={`edit-thf-price-${row.id}`}
                    label={t("manualDebts.form.fields.thfPrice")}
                    name="thf_price"
                    onChange={(value) => updatePricing("thf_price", value)}
                    value={pricing.thf_price}
                  />
                  <CurrencyEditField
                    error={getError("web_price")}
                    id={`edit-web-price-${row.id}`}
                    label={t("manualDebts.form.fields.webPrice")}
                    name="web_price"
                    onChange={(value) => updatePricing("web_price", value)}
                    value={pricing.web_price}
                  />
                  <CurrencyEditField
                    error={getError("insurance_price")}
                    id={`edit-insurance-price-${row.id}`}
                    label={t("manualDebts.form.fields.insurancePrice")}
                    name="insurance_price"
                    onChange={(value) =>
                      updatePricing("insurance_price", value)
                    }
                    value={pricing.insurance_price}
                  />
                  <CurrencyEditField
                    error={getError("selling_price")}
                    id={`edit-selling-price-${row.id}`}
                    label={t("manualDebts.form.fields.sellingPrice")}
                    name="selling_price"
                    onChange={(value) => updatePricing("selling_price", value)}
                    value={pricing.selling_price}
                  />
                  <CurrencyEditField
                    error={getError("discount")}
                    id={`edit-discount-${row.id}`}
                    label={t("manualDebts.form.fields.discount")}
                    name="discount"
                    onChange={(value) => updatePricing("discount", value)}
                    value={pricing.discount}
                  />
                  <CurrencyEditField
                    error={getError("net_price")}
                    id={`edit-net-price-${row.id}`}
                    label={t("manualDebts.form.fields.netPrice")}
                    name="net_price"
                    onChange={(value) => updatePricing("net_price", value)}
                    value={pricing.net_price}
                  />
                  <CurrencyEditField
                    error={getError("true_income")}
                    id={`edit-true-income-${row.id}`}
                    label={t("manualDebts.form.fields.trueIncome")}
                    name="true_income"
                    onChange={(value) => {
                      setIsIncomeOverridden(true)
                      setManualIncome(value)
                    }}
                    signed
                    value={displayedIncome}
                  />
                </div>
                <p className={styles.hint}>
                  {t("manualDebts.table.incomeAutoCalculateTooltip")}
                </p>
              </FormSection>

              <FormSection icon={Wallet} title={t("manualDebts.form.paymentGroup")}>
                <div className={styles.editorSectionContent}>
                  <div className={patterns.twoColumnGrid}>
                    {canEditLinkedPayment ? (
                      <CurrencyEditField
                        error={getError("payment_amount")}
                        id={`edit-payment-amount-${row.id}`}
                        label={t("manualDebts.table.columns.paymentAmount")}
                        name="payment_amount"
                        onChange={setPaymentAmount}
                        value={paymentAmount}
                      />
                    ) : (
                      <dl className={styles.detailGrid}>
                        <DetailItem
                          label={t("manualDebts.table.columns.paymentAmount")}
                          numeric
                          value={
                            row.linked_payment_amount === null
                              ? t("manualDebts.emptyValue")
                              : formatCurrency(row.linked_payment_amount)
                          }
                        />
                      </dl>
                    )}
                    <FormField
                      error={getError("payment_method")}
                      htmlFor={`edit-payment-method-${row.id}`}
                      label={t("manualDebts.form.fields.paymentMethod")}
                    >
                      <select
                        className={selectInputClassName}
                        disabled={!canEditPayment}
                        id={`edit-payment-method-${row.id}`}
                        name="payment_method"
                        onChange={(event) =>
                          setPaymentMethod(event.target.value as PaymentMethod | "")
                        }
                        value={paymentMethod}
                      >
                        <option value="">
                          {t("manualDebts.form.paymentMethodPlaceholder")}
                        </option>
                        {paymentMethodOptions.map((method) => (
                          <option key={method} value={method}>
                            {paymentMethodLabels[method]}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                  <div className={styles.sectionOffset}>
                    {canEditLinkedPayment ? (
                      <FormField
                        error={getError("payment_occurred_at")}
                        htmlFor={`edit-payment-date-${row.id}`}
                        label={t("manualDebts.form.fields.paymentDate")}
                      >
                        <Input
                          id={`edit-payment-date-${row.id}`}
                          name="payment_occurred_at"
                          onChange={(event) =>
                            setPaymentOccurredAt(event.target.value)
                          }
                          type="date"
                          value={paymentOccurredAt}
                        />
                      </FormField>
                    ) : (
                      <dl className={styles.detailGrid}>
                        <DetailItem
                          label={t("manualDebts.form.fields.paymentDate")}
                          value={
                            formatOptionalDate(row.linked_payment_occurred_at) ||
                            t("manualDebts.emptyValue")
                          }
                        />
                      </dl>
                    )}
                  </div>
                  <FormField
                    error={getError("payment_note")}
                    htmlFor={`edit-payment-note-${row.id}`}
                    label={t("manualDebts.table.columns.note")}
                  >
                    <Textarea
                      disabled={!canEditPayment}
                      id={`edit-payment-note-${row.id}`}
                      maxLength={2000}
                      name="payment_note"
                      onChange={(event) => setPaymentNote(event.target.value)}
                      rows={3}
                      value={paymentNote}
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection icon={Route} title={t("manualDebts.form.routeGroup")}>
                <div className={styles.editorSectionContent}>
                  <EditorTextField
                    defaultValue={row.itinerary ?? row.route ?? ""}
                    error={getError("itinerary")}
                    id={`edit-itinerary-${row.id}`}
                    label={t("manualDebts.form.fields.route")}
                    maxLength={100}
                    name="itinerary"
                  />
                </div>
              </FormSection>

              <div className={patterns.grid}>
                <div className={patterns.twoColumnGrid}>
                  <EditorTextField
                    defaultValue={row.pnr ?? ""}
                    error={getError("pnr")}
                    id={`edit-pnr-${row.id}`}
                    label={t("manualDebts.form.fields.pnr")}
                    maxLength={6}
                    name="pnr"
                  />
                  <EditorTextField
                    defaultValue={row.ticket_number ?? ""}
                    error={getError("ticket_number")}
                    id={`edit-ticket-number-${row.id}`}
                    label={t("manualDebts.form.fields.ticketNumber")}
                    maxLength={50}
                    name="ticket_number"
                  />
                </div>
                <div className={patterns.twoColumnGrid}>
                  <FormField
                    error={getError("airline")}
                    htmlFor={`edit-airline-${row.id}`}
                    label={t("manualDebts.form.fields.airline")}
                  >
                    <select
                      className={selectInputClassName}
                      defaultValue={row.airline ?? ""}
                      id={`edit-airline-${row.id}`}
                      name="airline"
                    >
                      <option value="">
                        {t("manualDebts.form.chooseAirline")}
                      </option>
                      {airlineOptions.map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    error={getError("flight_date")}
                    htmlFor={`edit-flight-date-${row.id}`}
                    label={t("manualDebts.form.fields.flightDate")}
                  >
                    <Input
                      defaultValue={formatDateTimeLocal(row.flight_date)}
                      id={`edit-flight-date-${row.id}`}
                      name="flight_date"
                      type="datetime-local"
                    />
                  </FormField>
                </div>
              </div>

              <FormSection
                icon={Info}
                title={t("manualDebts.table.groups.readOnly")}
              >
                <div className={styles.editorSectionContent}>
                  <dl className={styles.detailGrid}>
                    <DetailItem
                      label={t("manualDebts.table.columns.status")}
                      value={row.ticket_status ?? t("manualDebts.emptyValue")}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.createdAt")}
                      value={formatDate(row.created_at)}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.updatedAt")}
                      value={formatDate(row.updated_at)}
                    />
                  </dl>
                </div>
              </FormSection>
            </div>
          </LayoutContent>
        }
      />
    </form>
  )
}

function SortableTableHead({
  children,
  className,
  label,
  onSort,
  sortKey,
  sortState,
}: {
  children: React.ReactNode
  className?: string
  label: string
  onSort: (sortKey: SortKey) => void
  sortKey: SortKey
  sortState: SortState
}) {
  const isActive = sortState.key === sortKey
  const SortIcon = isActive
    ? sortState.direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ChevronsUpDown

  return (
    <TableHead
      aria-sort={
        isActive
          ? sortState.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      className={className}
    >
      <button
        aria-label={label}
        className={styles.sortButton}
        onClick={() => onSort(sortKey)}
        title={label}
        type="button"
      >
        <span>{children}</span>
        <SortIcon aria-hidden="true" className={styles.sortIcon} />
      </button>
    </TableHead>
  )
}

function ManualDebtTableRow({
  onEdit,
  row,
  tableView,
}: {
  onEdit: (row: LedgerReportRow) => void
  row: LedgerReportRow
  tableView: TableView
}) {
  const t = useI18n()
  const deleteFormId = `manual-debt-delete-${row.id}`
  const paymentMethodLabels: Record<PaymentMethod, string> = {
    "Chuyển khoản": t(
      "customers.ledger.paymentDialog.fields.methodOptions.bankTransfer",
    ),
    "Tiền mặt": t("customers.ledger.paymentDialog.fields.methodOptions.cash"),
    AST: t("customers.ledger.paymentDialog.fields.methodOptions.ast"),
    THF: t("customers.ledger.paymentDialog.fields.methodOptions.thf"),
  }
  const ticketPaymentMethod = paymentMethodOptions.find(
    (method) => method === row.transaction_method,
  )
  const paymentMethodDisplay =
    row.linked_payment_methods.length === 0
      ? ticketPaymentMethod
        ? paymentMethodLabels[ticketPaymentMethod]
        : t("manualDebts.emptyValue")
      : row.linked_payment_methods
          .map(
            (method) => paymentMethodLabels[method as PaymentMethod] ?? method,
          )
          .join(", ")

  return (
    <TableRow className={styles.tableRow}>
      <TableCell className={cn(styles.cell, styles.stickyCell)}>
        <span className={styles.displayDate}>
          {formatOptionalDate(row.booked_at) || t("manualDebts.emptyValue")}
        </span>
      </TableCell>
      <TableCell
        className={cn(styles.cell, styles.stickyContextCell)}
        title={[row.passenger_names, row.customer_name]
          .filter(Boolean)
          .join(" · ")}
      >
        <div className={styles.recordContext}>
          <span className={styles.passengerText}>
            {row.passenger_names || t("manualDebts.emptyValue")}
          </span>
          <span className={styles.customerText}>{row.customer_name}</span>
        </div>
      </TableCell>
      {tableView === "full" ? (
        <TableCell className={cn(styles.cell, styles.mutedCell)}>
          {formatDate(row.created_at)}
        </TableCell>
      ) : null}
      <TableCell className={styles.numberCell}>
        <span className={styles.displayValue}>
          {formatCurrency(row.ticket_selling_price)}
        </span>
      </TableCell>
      {tableView === "full" ? (
        <>
          <TableCell className={styles.numberCell}>
            <span className={styles.displayValue}>
              {formatCurrency(row.ticket_discount)}
            </span>
          </TableCell>
          <TableCell className={styles.numberCell}>
            <span className={styles.displayValue}>
              {formatCurrency(row.ticket_ev_price)}
            </span>
          </TableCell>
          <TableCell className={styles.numberCell}>
            <span className={styles.displayValue}>
              {formatCurrency(row.ticket_ast_price)}
            </span>
          </TableCell>
          <TableCell className={styles.numberCell}>
            <span className={styles.displayValue}>
              {formatCurrency(row.ticket_thf_price)}
            </span>
          </TableCell>
          <TableCell className={styles.numberCell}>
            <span className={styles.displayValue}>
              {formatCurrency(row.ticket_web_price)}
            </span>
          </TableCell>
          <TableCell className={styles.numberCell}>
            <span className={styles.displayValue}>
              {formatCurrency(row.ticket_insurance_price)}
            </span>
          </TableCell>
        </>
      ) : null}
      <TableCell className={styles.valueCell}>
        <Tooltip
          content={t("manualDebts.table.incomeAutoCalculateTooltip")}
          hasHoverIndication={false}
          placement="above"
        >
          <span className={styles.displayValue}>
            {formatCurrency(row.ticket_true_income)}
          </span>
        </Tooltip>
      </TableCell>
      {tableView === "full" ? (
        <TableCell className={styles.valueCell}>
          {row.linked_payment_amount === null
            ? ""
            : formatCurrency(row.linked_payment_amount)}
        </TableCell>
      ) : null}
      <TableCell className={styles.paymentMethodCell}>
        <span className={styles.paymentMethodValue}>
          {paymentMethodDisplay}
        </span>
      </TableCell>
      <TableCell className={styles.noteCell}>
        {row.linked_payment_note ?? ""}
      </TableCell>
      <TableCell className={styles.actionsCell}>
        <div className={styles.rowActions}>
          {row.ticket_id ? (
            <>
              <form
                action={deleteManualDebtRowAction}
                className={patterns.hidden}
                id={deleteFormId}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      t("manualDebts.table.actions.deleteConfirm"),
                    )
                  ) {
                    event.preventDefault()
                  }
                }}
              >
                <input
                  name="customer_id"
                  type="hidden"
                  value={row.customer_id}
                />
                <input name="ticket_id" type="hidden" value={row.ticket_id} />
              </form>
              <Button
                aria-label={t("manualDebts.table.actions.edit")}
                onClick={() => onEdit(row)}
                size="icon"
                title={t("manualDebts.table.actions.edit")}
                type="button"
                variant="outline"
              >
                <Pencil className={patterns.iconCompact} />
              </Button>
              <Button
                aria-label={t("manualDebts.table.actions.delete")}
                form={deleteFormId}
                size="icon"
                title={t("manualDebts.table.actions.delete")}
                type="submit"
                variant="destructive"
              >
                <Trash2 className={patterns.iconCompact} />
              </Button>
            </>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}

function TableHorizontalControls({
  isLoading,
  onPageChange,
  onTableViewChange,
  pagination,
  resultCount,
  scrollContainerRef,
  tableView,
}: {
  isLoading: boolean
  onPageChange: (page: number) => void
  onTableViewChange: (view: TableView) => void
  pagination: {
    page: number
    total_pages: number
    has_next: boolean
  }
  resultCount: number
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  tableView: TableView
}) {
  const t = useI18n()
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const updateScrollState = React.useCallback(() => {
    const container = scrollContainerRef.current

    if (!container) {
      return
    }

    const maximumScrollLeft = container.scrollWidth - container.clientWidth
    setCanScrollLeft(container.scrollLeft > 1)
    setCanScrollRight(container.scrollLeft < maximumScrollLeft - 1)
  }, [scrollContainerRef])

  React.useEffect(() => {
    const container = scrollContainerRef.current

    if (!container) {
      return
    }

    updateScrollState()
    container.addEventListener("scroll", updateScrollState, { passive: true })

    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(container)
    const table = container.querySelector("table")

    if (table) {
      resizeObserver.observe(table)
    }

    return () => {
      container.removeEventListener("scroll", updateScrollState)
      resizeObserver.disconnect()
    }
  }, [scrollContainerRef, tableView, updateScrollState])

  const scrollTable = (direction: -1 | 1) => {
    const container = scrollContainerRef.current

    if (!container) {
      return
    }

    const headerCells = Array.from(
      container.querySelectorAll<HTMLTableCellElement>(
        "thead tr:last-child th",
      ),
    )
    const pageDistance = Math.max(container.clientWidth * 0.7, 320)
    const targetThreshold =
      container.scrollLeft + direction * pageDistance
    const targetCell =
      direction === 1
        ? headerCells.find((cell) => cell.offsetLeft >= targetThreshold)
        : headerCells
            .slice()
            .reverse()
            .find((cell) => cell.offsetLeft <= targetThreshold)
    const maximumScrollLeft = container.scrollWidth - container.clientWidth
    const targetLeft =
      targetCell?.offsetLeft ?? (direction === 1 ? maximumScrollLeft : 0)

    container.scrollTo({
      behavior: "smooth",
      left: Math.min(Math.max(targetLeft, 0), maximumScrollLeft),
    })
  }

  return (
    <div className={styles.scrollControls}>
      <div className={styles.tableResult}>
        <span className={styles.resultCount}>{resultCount}</span>
        <span>{t("manualDebts.table.results")}</span>
      </div>
      <div className={styles.tableViewControls}>
        <div className={styles.paginationControls}>
          <Button
            aria-label={t("manualDebts.table.pagination.previous")}
            disabled={isLoading || pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            size="icon"
            title={t("manualDebts.table.pagination.previous")}
            type="button"
            variant="outline"
          >
            <ChevronLeft className={patterns.iconCompact} />
          </Button>
          <span className={styles.pageLabel}>
            {t("manualDebts.table.pagination.page", {
              page: pagination.page,
              totalPages: pagination.total_pages,
            })}
          </span>
          <Button
            aria-label={t("manualDebts.table.pagination.next")}
            disabled={isLoading || !pagination.has_next}
            onClick={() => onPageChange(pagination.page + 1)}
            size="icon"
            title={t("manualDebts.table.pagination.next")}
            type="button"
            variant="outline"
          >
            <ChevronRight className={patterns.iconCompact} />
          </Button>
        </div>
        <div
          aria-label={t("manualDebts.table.view.label")}
          className={styles.viewSwitcher}
          role="group"
        >
          <Button
            aria-pressed={tableView === "summary"}
            onClick={() => onTableViewChange("summary")}
            size="sm"
            type="button"
            variant={tableView === "summary" ? "secondary" : "ghost"}
          >
            {t("manualDebts.table.view.summary")}
          </Button>
          <Button
            aria-pressed={tableView === "full"}
            onClick={() => onTableViewChange("full")}
            size="sm"
            type="button"
            variant={tableView === "full" ? "secondary" : "ghost"}
          >
            {t("manualDebts.table.view.full")}
          </Button>
        </div>
        <div
          aria-label={t("manualDebts.table.horizontalScrollControls")}
          className={styles.scrollButtons}
          role="group"
        >
          <Button
            aria-label={t("manualDebts.table.scrollLeft")}
            disabled={!canScrollLeft}
            onClick={() => scrollTable(-1)}
            size="icon"
            title={t("manualDebts.table.scrollLeft")}
            type="button"
            variant="outline"
          >
            <ArrowLeft className={patterns.iconCompact} />
          </Button>
          <Button
            aria-label={t("manualDebts.table.scrollRight")}
            disabled={!canScrollRight}
            onClick={() => scrollTable(1)}
            size="icon"
            title={t("manualDebts.table.scrollRight")}
            type="button"
            variant="outline"
          >
            <ArrowRight className={patterns.iconCompact} />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ManualDebtInputClient({
  customers,
  initialPage,
}: ManualDebtInputClientProps) {
  const t = useI18n()
  const router = useRouter()
  const formRef = React.useRef<HTMLFormElement>(null)
  const tableScrollRef = React.useRef<HTMLDivElement>(null)
  const reportRequestIdRef = React.useRef(0)
  const previousInitialPageRef = React.useRef(initialPage)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isFormDirty, setIsFormDirty] = React.useState(false)
  const [isSubmitPending, setIsSubmitPending] = React.useState(false)
  const [editingRow, setEditingRow] = React.useState<LedgerReportRow | null>(
    null,
  )
  const [tableView, setTableView] = React.useState<TableView>("summary")
  const [actionState, setActionState] = React.useState<ManualDebtActionState>(
    initialManualDebtActionState,
  )
  const [reportRows, setReportRows] = React.useState(initialPage.items)
  const [reportPagination, setReportPagination] = React.useState(
    initialPage.pagination,
  )
  const [searchValue, setSearchValue] = React.useState("")
  const [appliedSearch, setAppliedSearch] = React.useState("")
  const [isRowsLoading, setIsRowsLoading] = React.useState(false)
  const [rowsError, setRowsError] = React.useState<string | null>(null)
  const [sortState, setSortState] = React.useState<SortState>({
    key: "createdAt",
    direction: "desc",
  })
  const [sellingPrice, setSellingPrice] = React.useState(0)
  const [discount, setDiscount] = React.useState(0)
  const [evPrice, setEvPrice] = React.useState(0)
  const [astPrice, setAstPrice] = React.useState(0)
  const [thfPrice, setThfPrice] = React.useState(0)
  const [webPrice, setWebPrice] = React.useState(0)
  const [insurancePrice, setInsurancePrice] = React.useState(0)
  const [paymentAmount, setPaymentAmount] = React.useState(0)
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod | "">(
    "",
  )
  const [paymentDate, setPaymentDate] = React.useState("")
  const [formResetKey, setFormResetKey] = React.useState(0)
  const paymentMethodLabels: Record<PaymentMethod, string> = {
    "Chuyển khoản": t(
      "customers.ledger.paymentDialog.fields.methodOptions.bankTransfer",
    ),
    "Tiền mặt": t("customers.ledger.paymentDialog.fields.methodOptions.cash"),
    AST: t("customers.ledger.paymentDialog.fields.methodOptions.ast"),
    THF: t("customers.ledger.paymentDialog.fields.methodOptions.thf"),
  }

  const resetManualDebtForm = React.useCallback(() => {
    setSellingPrice(0)
    setDiscount(0)
    setEvPrice(0)
    setAstPrice(0)
    setThfPrice(0)
    setWebPrice(0)
    setInsurancePrice(0)
    setPaymentAmount(0)
    setPaymentMethod("")
    setPaymentDate("")
    setIsFormDirty(false)
    setActionState(initialManualDebtActionState)
    setFormResetKey((current) => current + 1)
  }, [])

  React.useEffect(() => {
    if (actionState.status !== "success") {
      return
    }

    toast.success(actionState.message ?? t("manualDebts.actions.success"))
    resetManualDebtForm()
    setIsFormOpen(false)
    router.refresh()
  }, [
    actionState.message,
    actionState.status,
    actionState.submittedAt,
    resetManualDebtForm,
    router,
    t,
  ])

  const loadReportPage = React.useCallback(
    async (page: number, query: string) => {
      const requestId = reportRequestIdRef.current + 1
      reportRequestIdRef.current = requestId
      setIsRowsLoading(true)
      setRowsError(null)

      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: "50",
        })
        if (query.trim()) {
          params.set("q", query.trim())
        }

        const response = await fetch(`/report/data?${params.toString()}`, {
          cache: "no-store",
        })

        if (response.status === 401) {
          expireStoredSession("unauthorized")
          router.replace(SESSION_EXPIRED_LOGIN_PATH)
          return
        }

        if (!response.ok) {
          throw new Error("Unable to refresh debt rows.")
        }

        const payload = (await response.json()) as TicketDebtReportPage
        if (requestId !== reportRequestIdRef.current) {
          return
        }
        setReportRows(payload.items)
        setReportPagination(payload.pagination)
        setAppliedSearch(query.trim())
      } catch {
        if (requestId !== reportRequestIdRef.current) {
          return
        }
        setRowsError(t("manualDebts.table.loadFailure"))
      } finally {
        if (requestId === reportRequestIdRef.current) {
          setIsRowsLoading(false)
        }
      }
    },
    [router, t],
  )

  React.useEffect(() => {
    const nextSearch = searchValue.trim()

    if (nextSearch === appliedSearch) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void loadReportPage(1, nextSearch)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [appliedSearch, loadReportPage, searchValue])

  React.useEffect(() => {
    if (previousInitialPageRef.current === initialPage) {
      return
    }

    previousInitialPageRef.current = initialPage

    if (reportPagination.page === 1 && !appliedSearch) {
      setReportRows(initialPage.items)
      setReportPagination(initialPage.pagination)
      setRowsError(null)
      return
    }

    void loadReportPage(reportPagination.page, appliedSearch)
  }, [appliedSearch, initialPage, loadReportPage, reportPagination.page])

  const filteredRows = React.useMemo(() => {
    return reportRows
      .map((row, index) => ({ row, index }))
      .sort((first, second) => {
        const comparison = compareSortValues(
          getRowSortValue(first.row, sortState.key),
          getRowSortValue(second.row, sortState.key),
        )

        if (comparison !== 0) {
          return sortState.direction === "asc" ? comparison : -comparison
        }

        return first.index - second.index
      })
      .map(({ row }) => row)
  }, [reportRows, sortState])

  const trueIncome =
    sellingPrice + discount - (evPrice + astPrice + thfPrice + webPrice + insurancePrice)
  const fieldErrors = actionState.fieldErrors

  const handleFormOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (
        !nextOpen &&
        isFormDirty &&
        !window.confirm(t("manualDebts.form.unsavedConfirm"))
      ) {
        return
      }

      if (!nextOpen) {
        resetManualDebtForm()
      }

      setIsFormOpen(nextOpen)
    },
    [isFormDirty, resetManualDebtForm, t],
  )

  const openManualDebtForm = () => {
    resetManualDebtForm()
    setIsFormOpen(true)
  }

  const handleSort = React.useCallback((sortKey: SortKey) => {
    setSortState((current) =>
      current.key === sortKey
        ? {
            key: sortKey,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : {
            key: sortKey,
            direction: getDefaultSortDirection(sortKey),
          },
    )
  }, [])

  const dispatchManualDebtAction = React.useCallback(async () => {
    if (!formRef.current) {
      return
    }

    const formData = new FormData(formRef.current)
    formData.set("intent", "manual-debt")
    setIsSubmitPending(true)

    try {
      const response = await fetch("/api/ledger-records", {
        method: "POST",
        body: formData,
        cache: "no-store",
      })
      const nextState = (await response.json()) as ManualDebtActionState

      setActionState(nextState)
    } catch {
      setActionState({
        status: "error",
        message: t("manualDebts.actions.failure"),
        fieldErrors: {},
        submittedAt: Date.now(),
        ticketId: null,
      })
    } finally {
      setIsSubmitPending(false)
    }
  }, [t])

  const handleManualDebtSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    dispatchManualDebtAction()
  }

  return (
    <div className={patterns.pageStack}>
      <Dialog
        className={cn(styles.sideDrawer, styles.formDrawer)}
        isOpen={isFormOpen}
        maxHeight="100dvh"
        onOpenChange={handleFormOpenChange}
        padding={0}
        position={{ bottom: 0, left: 0, top: 0 }}
        purpose="info"
        width="min(30rem, 100dvw)"
      >
        <Layout
          className={styles.drawerLayout}
          defaultHasDividers
          header={
            <DialogHeader
              className={styles.drawerHeader}
              endContent={
                <SubmitButton
                  onSubmit={dispatchManualDebtAction}
                  pending={isSubmitPending}
                />
              }
              onOpenChange={handleFormOpenChange}
              title={t("manualDebts.form.title")}
            />
          }
          content={
            <LayoutContent className={styles.formDrawerContent} padding={0}>
            <form
              className={styles.manualForm}
              key={formResetKey}
              onChange={() => setIsFormDirty(true)}
              onSubmit={handleManualDebtSubmit}
              ref={formRef}
            >
              <div className={styles.formBody}>
                {actionState.message ? (
                  <Banner
                    status={actionState.status === "success" ? "success" : "error"}
                    title={actionState.message}
                  />
                ) : null}

                <div className={patterns.grid}>
                  <FormField
                    error={getFieldError(fieldErrors, "customer_name")}
                    htmlFor="manual-debt-customer"
                    isRequired
                    label={t("manualDebts.form.fields.customer")}
                  >
                    <CustomerAutocomplete
                      customers={customers}
                      id="manual-debt-customer"
                      name="customer_name"
                      noResultsLabel={t("manualDebts.form.customerNoResults")}
                      placeholder={t("manualDebts.form.customerPlaceholder")}
                      required
                    />
                  </FormField>

                  <FormField
                    error={getFieldError(fieldErrors, "booked_at")}
                    htmlFor="manual-debt-booked-at"
                    label={t("manualDebts.form.fields.bookedAt")}
                  >
                    <Input
                      defaultValue={getLocalDateToday()}
                      id="manual-debt-booked-at"
                      name="booked_at"
                      type="date"
                    />
                  </FormField>

                  <FormField
                    error={getFieldError(fieldErrors, "passengers")}
                    htmlFor="manual-debt-passengers"
                    label={t("manualDebts.form.fields.passengers")}
                  >
                    <Textarea
                      id="manual-debt-passengers"
                      name="passengers"
                    />
                  </FormField>
                </div>

                <FormSection
                  icon={CircleDollarSign}
                  title={t("manualDebts.form.pricingGroup")}
                >
                  <div className={patterns.grid}>
                    <input name="net_price" type="hidden" value="0" />
                    <div className={patterns.twoColumnGrid}>
                      <FormField
                        error={getFieldError(fieldErrors, "ev_price")}
                        htmlFor="manual-debt-ev-price"
                        label={t("manualDebts.form.fields.evPrice")}
                      >
                        <Input
                          id="manual-debt-ev-price"
                          inputMode="numeric"
                          min={0}
                          name="ev_price"
                          onChange={(event) => setEvPrice(parseCurrencyInput(event.target.value))}
                          type="text"
                          value={evPrice > 0 ? formatCurrencyInput(evPrice) : ""}
                        />
                      </FormField>
                      <FormField
                        error={getFieldError(fieldErrors, "ast_price")}
                        htmlFor="manual-debt-ast-price"
                        label={t("manualDebts.form.fields.astPrice")}
                      >
                        <Input
                          id="manual-debt-ast-price"
                          inputMode="numeric"
                          min={0}
                          name="ast_price"
                          onChange={(event) => setAstPrice(parseCurrencyInput(event.target.value))}
                          type="text"
                          value={astPrice > 0 ? formatCurrencyInput(astPrice) : ""}
                        />
                      </FormField>
                      <FormField
                        error={getFieldError(fieldErrors, "thf_price")}
                        htmlFor="manual-debt-thf-price"
                        label={t("manualDebts.form.fields.thfPrice")}
                      >
                        <Input
                          id="manual-debt-thf-price"
                          inputMode="numeric"
                          min={0}
                          name="thf_price"
                          onChange={(event) => setThfPrice(parseCurrencyInput(event.target.value))}
                          type="text"
                          value={thfPrice > 0 ? formatCurrencyInput(thfPrice) : ""}
                        />
                      </FormField>
                      <FormField
                        error={getFieldError(fieldErrors, "web_price")}
                        htmlFor="manual-debt-web-price"
                        label={t("manualDebts.form.fields.webPrice")}
                      >
                        <Input
                          id="manual-debt-web-price"
                          inputMode="numeric"
                          min={0}
                          name="web_price"
                          onChange={(event) => setWebPrice(parseCurrencyInput(event.target.value))}
                          type="text"
                          value={webPrice > 0 ? formatCurrencyInput(webPrice) : ""}
                        />
                      </FormField>
                      <FormField
                        error={getFieldError(fieldErrors, "insurance_price")}
                        htmlFor="manual-debt-insurance-price"
                        label={t("manualDebts.form.fields.insurancePrice")}
                      >
                        <Input
                          id="manual-debt-insurance-price"
                          inputMode="numeric"
                          min={0}
                          name="insurance_price"
                          onChange={(event) => setInsurancePrice(parseCurrencyInput(event.target.value))}
                          type="text"
                          value={insurancePrice > 0 ? formatCurrencyInput(insurancePrice) : ""}
                        />
                      </FormField>
                      <FormField
                        error={getFieldError(fieldErrors, "selling_price")}
                        htmlFor="manual-debt-selling-price"
                        label={t("manualDebts.form.fields.sellingPrice")}
                      >
                        <Input
                          id="manual-debt-selling-price"
                          inputMode="numeric"
                          min={0}
                          name="selling_price"
                          onChange={(event) => setSellingPrice(parseCurrencyInput(event.target.value))}
                          type="text"
                          value={sellingPrice > 0 ? formatCurrencyInput(sellingPrice) : ""}
                        />
                      </FormField>
                      <FormField
                        error={getFieldError(fieldErrors, "discount")}
                        htmlFor="manual-debt-discount"
                        label={t("manualDebts.form.fields.discount")}
                      >
                        <Input
                          id="manual-debt-discount"
                          inputMode="numeric"
                          min={0}
                          name="discount"
                          onChange={(event) => setDiscount(parseCurrencyInput(event.target.value))}
                          type="text"
                          value={discount > 0 ? formatCurrencyInput(discount) : ""}
                        />
                      </FormField>
                    </div>
                    <div className={styles.incomeSummary}>
                      <p className={patterns.eyebrow}>
                        {t("manualDebts.table.columns.income")}
                      </p>
                      <p className={styles.incomeValue}>
                        {formatCurrency(trueIncome)}
                      </p>
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  icon={Wallet}
                  title={t("manualDebts.form.paymentGroup")}
                >
                  <div className={patterns.twoColumnGrid}>
                    <FormField
                      error={getFieldError(fieldErrors, "payment_amount")}
                      htmlFor="manual-debt-payment-amount"
                      label={t("manualDebts.form.fields.paymentAmount")}
                    >
                      <Input
                        id="manual-debt-payment-amount"
                        inputMode="numeric"
                        min={0}
                        name="payment_amount"
                        onChange={(event) =>
                          setPaymentAmount(parseCurrencyInput(event.target.value))
                        }
                        placeholder={t(
                          "manualDebts.form.paymentAmountPlaceholder",
                        )}
                        type="text"
                        value={
                          paymentAmount > 0
                            ? formatCurrencyInput(paymentAmount)
                            : ""
                        }
                      />
                    </FormField>
                    <FormField
                      error={getFieldError(fieldErrors, "payment_method")}
                      htmlFor="manual-debt-payment-method"
                      label={t("manualDebts.form.fields.paymentMethod")}
                    >
                      <select
                        className={selectInputClassName}
                        id="manual-debt-payment-method"
                        name="payment_method"
                        onChange={(event) => {
                          const nextMethod = event.target.value as
                            | PaymentMethod
                            | ""

                          setPaymentMethod(nextMethod)
                          if (!nextMethod) {
                            setPaymentDate("")
                          }
                        }}
                        value={paymentMethod}
                      >
                        <option value="">
                          {t("manualDebts.form.paymentMethodPlaceholder")}
                        </option>
                        {paymentMethodOptions.map((method) => (
                          <option key={method} value={method}>
                            {paymentMethodLabels[method]}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                  <div className={styles.sectionOffset}>
                    <FormField
                      error={getFieldError(fieldErrors, "payment_date")}
                      htmlFor="manual-debt-payment-date"
                      label={t("manualDebts.form.fields.paymentDate")}
                    >
                      <Input
                        disabled={!paymentMethod}
                        id="manual-debt-payment-date"
                        name="payment_date"
                        onChange={(event) => setPaymentDate(event.target.value)}
                        type="date"
                        value={paymentDate}
                      />
                    </FormField>
                  </div>
                  <p className={styles.hint}>
                    {t("manualDebts.form.paymentHint")}
                  </p>
                </FormSection>

                <FormSection icon={Route} title={t("manualDebts.form.routeGroup")}>
                  <div>
                    <FormField
                      error={getFieldError(fieldErrors, "itinerary")}
                      htmlFor="manual-debt-itinerary"
                      label={t("manualDebts.form.fields.route")}
                    >
                      <Input id="manual-debt-itinerary" name="itinerary" />
                    </FormField>
                  </div>
                  <div className={cn(patterns.twoColumnGrid, styles.sectionOffset)}>
                    <FormField
                      error={getFieldError(fieldErrors, "departure_code")}
                      htmlFor="manual-debt-departure-code"
                      label={t("manualDebts.form.fields.departureCode")}
                    >
                      <Input
                        autoCapitalize="characters"
                        id="manual-debt-departure-code"
                        name="departure_code"
                      />
                    </FormField>
                    <FormField
                      error={getFieldError(fieldErrors, "arrival_code")}
                      htmlFor="manual-debt-arrival-code"
                      label={t("manualDebts.form.fields.arrivalCode")}
                    >
                      <Input
                        autoCapitalize="characters"
                        id="manual-debt-arrival-code"
                        name="arrival_code"
                      />
                    </FormField>
                  </div>
                </FormSection>

                <div className={patterns.grid}>
                  <div className={patterns.twoColumnGrid}>
                    <FormField
                      error={getFieldError(fieldErrors, "pnr")}
                      htmlFor="manual-debt-pnr"
                      label={t("manualDebts.form.fields.pnr")}
                    >
                      <Input
                        autoCapitalize="characters"
                        id="manual-debt-pnr"
                        maxLength={6}
                        name="pnr"
                      />
                    </FormField>
                    <FormField
                      error={getFieldError(fieldErrors, "ticket_number")}
                      htmlFor="manual-debt-ticket-number"
                      label={t("manualDebts.form.fields.ticketNumber")}
                    >
                      <Input id="manual-debt-ticket-number" name="ticket_number" />
                    </FormField>
                  </div>

                  <div className={patterns.twoColumnGrid}>
                    <FormField
                      error={getFieldError(fieldErrors, "airline")}
                      htmlFor="manual-debt-airline"
                      label={t("manualDebts.form.fields.airline")}
                    >
                      <AirlineAutocomplete
                        id="manual-debt-airline"
                        name="airline"
                        noResultsLabel={t("manualDebts.form.airlineNoResults")}
                        placeholder={t("manualDebts.form.chooseAirline")}
                      />
                    </FormField>
                    <FormField
                      error={getFieldError(fieldErrors, "flight_date")}
                      htmlFor="manual-debt-flight-date"
                      label={t("manualDebts.form.fields.flightDate")}
                    >
                      <Input
                        defaultValue={getLocalDateToday()}
                        id="manual-debt-flight-date"
                        name="flight_date"
                        type="date"
                      />
                    </FormField>
                  </div>
                </div>
              </div>
            </form>
            </LayoutContent>
          }
        />
      </Dialog>

      <div className={styles.tableColumn}>
        <Panel className={styles.tablePanel}>
            <div className={styles.filterHeader}>
              {/* TODO: Reintroduce the date range filter with a shared timezone contract. */}
              <div className={styles.filterForm}>
                <div className={styles.searchField}>
                  <Label
                    className={patterns.eyebrow}
                    htmlFor="manual-debt-search"
                  >
                    {t("manualDebts.filters.searchLabel")}
                  </Label>
                  <div className={styles.searchInputWrap}>
                    <Search
                      aria-hidden="true"
                      className={styles.searchIcon}
                    />
                    <Input
                      aria-label={t("manualDebts.filters.searchLabel")}
                      className={styles.searchInput}
                      id="manual-debt-search"
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder={t("manualDebts.filters.searchPlaceholder")}
                      type="search"
                      value={searchValue}
                    />
                  </div>
                </div>
              </div>
              <Button
                className={styles.openFormButton}
                onClick={openManualDebtForm}
                type="button"
              >
                <Plus className={patterns.iconSmall} />
                {t("manualDebts.actions.openForm")}
              </Button>
            </div>
            {rowsError ? (
              <p className={styles.tableError} role="alert">
                {rowsError}
              </p>
            ) : null}
            {isRowsLoading ? (
              <span aria-live="polite" className={styles.loadingStatus} role="status">
                <Loader2 className={`${patterns.iconSmall} ${patterns.spinner}`} />
                {t("manualDebts.table.loading")}
              </span>
            ) : null}
            <TableHorizontalControls
              isLoading={isRowsLoading}
              onPageChange={(page) => void loadReportPage(page, appliedSearch)}
              onTableViewChange={setTableView}
              pagination={reportPagination}
              resultCount={reportPagination.total}
              scrollContainerRef={tableScrollRef}
              tableView={tableView}
            />
            <div className={styles.tableArea}>
              <Table
                aria-busy={isRowsLoading}
                className={cn(
                  styles.ledgerTable,
                  tableView === "full"
                    ? styles.ledgerTableFull
                    : styles.ledgerTableSummary,
                )}
                containerClassName={styles.tableViewport}
                containerRef={tableScrollRef}
              >
                <TableHeader className={styles.stickyHeader}>
                  <TableRow>
                    <SortableTableHead
                      className={styles.headerStickyLeft}
                      label={t("manualDebts.table.columns.bookedAt")}
                      onSort={handleSort}
                      sortKey="bookedAt"
                      sortState={sortState}
                    >
                      {t("manualDebts.table.columns.bookedAt")}
                    </SortableTableHead>
                    <SortableTableHead
                      className={styles.headerStickyContext}
                      label={t("manualDebts.table.columns.description")}
                      onSort={handleSort}
                      sortKey="description"
                      sortState={sortState}
                    >
                      {t("manualDebts.table.columns.description")}
                    </SortableTableHead>
                    {tableView === "full" ? (
                      <SortableTableHead
                        className={styles.headerCell}
                        label={t("manualDebts.table.columns.createdAt")}
                        onSort={handleSort}
                        sortKey="createdAt"
                        sortState={sortState}
                      >
                        {t("manualDebts.table.columns.createdAt")}
                      </SortableTableHead>
                    ) : null}
                    <SortableTableHead
                      className={cn(
                        styles.headerNumber,
                        styles.groupStart,
                      )}
                      label={t("manualDebts.table.columns.customerPaid")}
                      onSort={handleSort}
                      sortKey="customerPaid"
                      sortState={sortState}
                    >
                      {t("manualDebts.table.columns.customerPaid")}
                    </SortableTableHead>
                    {tableView === "full" ? (
                      <>
                        <SortableTableHead
                          className={styles.headerNumber}
                          label={t("manualDebts.table.columns.discount")}
                          onSort={handleSort}
                          sortKey="discount"
                          sortState={sortState}
                        >
                          {t("manualDebts.table.columns.discount")}
                        </SortableTableHead>
                        <SortableTableHead
                          className={cn(
                            styles.headerNumber,
                            styles.groupStart,
                          )}
                          label={t("manualDebts.table.columns.evPrice")}
                          onSort={handleSort}
                          sortKey="evPrice"
                          sortState={sortState}
                        >
                          {t("manualDebts.table.columns.evPrice")}
                        </SortableTableHead>
                        <SortableTableHead
                          className={styles.headerNumber}
                          label={t("manualDebts.table.columns.astPrice")}
                          onSort={handleSort}
                          sortKey="astPrice"
                          sortState={sortState}
                        >
                          {t("manualDebts.table.columns.astPrice")}
                        </SortableTableHead>
                        <SortableTableHead
                          className={styles.headerNumber}
                          label={t("manualDebts.table.columns.thfPrice")}
                          onSort={handleSort}
                          sortKey="thfPrice"
                          sortState={sortState}
                        >
                          {t("manualDebts.table.columns.thfPrice")}
                        </SortableTableHead>
                        <SortableTableHead
                          className={styles.headerNumber}
                          label={t("manualDebts.table.columns.webPrice")}
                          onSort={handleSort}
                          sortKey="webPrice"
                          sortState={sortState}
                        >
                          {t("manualDebts.table.columns.webPrice")}
                        </SortableTableHead>
                        <SortableTableHead
                          className={styles.headerNumber}
                          label={t("manualDebts.table.columns.insurancePrice")}
                          onSort={handleSort}
                          sortKey="insurancePrice"
                          sortState={sortState}
                        >
                          {t("manualDebts.table.columns.insurancePrice")}
                        </SortableTableHead>
                      </>
                    ) : null}
                    <SortableTableHead
                      className={cn(
                        styles.headerNumber,
                        styles.groupStart,
                      )}
                      label={t("manualDebts.table.columns.income")}
                      onSort={handleSort}
                      sortKey="income"
                      sortState={sortState}
                    >
                      <span className={styles.headerWithHint}>
                        {t("manualDebts.table.columns.income")}
                        <Tooltip
                          content={t("manualDebts.table.incomeAutoCalculateTooltip")}
                          hasHoverIndication={false}
                          placement="above"
                        >
                          <span
                            aria-label={t("manualDebts.table.incomeAutoCalculateTooltip")}
                            className={styles.tooltipTrigger}
                            tabIndex={0}
                          >
                            <Info aria-hidden="true" className={patterns.iconCompact} />
                          </span>
                        </Tooltip>
                      </span>
                    </SortableTableHead>
                    {tableView === "full" ? (
                      <SortableTableHead
                        className={styles.headerNumber}
                        label={t("manualDebts.table.columns.paymentAmount")}
                        onSort={handleSort}
                        sortKey="paymentAmount"
                        sortState={sortState}
                      >
                        {t("manualDebts.table.columns.paymentAmount")}
                      </SortableTableHead>
                    ) : null}
                    <SortableTableHead
                      className={styles.headerPaymentMethod}
                      label={t("manualDebts.table.columns.paymentMethod")}
                      onSort={handleSort}
                      sortKey="paymentMethod"
                      sortState={sortState}
                    >
                      {t("manualDebts.table.columns.paymentMethod")}
                    </SortableTableHead>
                    <TableHead className={styles.headerNote}>
                      {t("manualDebts.table.columns.note")}
                    </TableHead>
                    <TableHead className={styles.headerStickyRight}>
                      {t("manualDebts.table.columns.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRowsLoading && filteredRows.length === 0 ? (
                    <TableStateRow
                      colSpan={tableView === "full" ? 15 : 7}
                      message={t("manualDebts.table.loading")}
                      state="loading"
                    />
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={tableView === "full" ? 15 : 7}>
                        <EmptyState
                          icon={ReceiptText}
                          message={
                            appliedSearch
                              ? t("manualDebts.table.searchEmpty")
                              : t("manualDebts.table.empty")
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <ManualDebtTableRow
                        key={row.id}
                        onEdit={setEditingRow}
                        row={row}
                        tableView={tableView}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>
      <ManualDebtEditorDrawer
        onOpenChange={(open) => {
          if (!open) {
            setEditingRow(null)
          }
        }}
        row={editingRow}
      />
    </div>
  )
}
