"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { Banner } from "@astryxdesign/core/Banner"
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog"
import { Layout, LayoutContent } from "@astryxdesign/core/Layout"
import { Tooltip } from "@astryxdesign/core/Tooltip"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleDollarSign,
  Eye,
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
  initialManualDebtActionState,
  paymentMethodOptions,
  type Airline,
  type CustomerDirectoryItem,
  type CustomerDirectoryPage,
  type ManualDebtActionState,
  type ManualDebtFormValues,
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

function EditableMoneyCell({
  editing,
  formId,
  name,
  onBlur,
  onKeyDown,
  signed = false,
  tooltip,
  value,
}: {
  editing: boolean
  formId: string
  name: string
  onBlur: React.FocusEventHandler<HTMLInputElement>
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>
  signed?: boolean
  tooltip?: string
  value: number
}) {
  const formatValue = signed ? formatSignedCurrencyInput : formatCurrencyInput

  if (!editing) {
    const displayValue = (
      <span className={styles.displayValue}>
        {formatCurrency(value)}
      </span>
    )

    return tooltip ? (
      <Tooltip content={tooltip} hasHoverIndication={false} placement="above">
        {displayValue}
      </Tooltip>
    ) : (
      displayValue
    )
  }

  const input = (
    <Input
      aria-label={tooltip}
      className={cn(styles.editableMoney, signed && styles.editableIncome)}
      defaultValue={formatValue(value)}
      form={formId}
      inputMode={signed ? "decimal" : "numeric"}
      min={signed ? undefined : 0}
      name={name}
      onBlur={onBlur}
      onChange={(event) => {
        event.target.value = formatValue(event.target.value)
      }}
      onKeyDown={onKeyDown}
      type="text"
    />
  )

  return tooltip ? (
    <Tooltip content={tooltip} hasHoverIndication={false} placement="above">
      {input}
    </Tooltip>
  ) : (
    input
  )
}

function EditableTextCell({
  ariaLabel,
  editing,
  emptyValue,
  formId,
  name,
  onBlur,
  onKeyDown,
  value,
}: {
  ariaLabel: string
  editing: boolean
  emptyValue: string
  formId: string
  name: string
  onBlur: React.FocusEventHandler<HTMLInputElement>
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>
  value: string
}) {
  if (!editing) {
    return (
      <span className={styles.passengerText}>
        {value || emptyValue}
      </span>
    )
  }

  return (
    <Input
      aria-label={ariaLabel}
      className={styles.editableText}
      defaultValue={value}
      form={formId}
      name={name}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      type="text"
    />
  )
}

function EditableDateCell({
  editing,
  formId,
  name,
  onBlur,
  onKeyDown,
  value,
}: {
  editing: boolean
  formId: string
  name: string
  onBlur: React.FocusEventHandler<HTMLInputElement>
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>
  value: string | null
}) {
  const t = useI18n()

  if (!editing) {
    return (
      <span className={styles.displayDate}>
        {formatOptionalDate(value) || t("manualDebts.emptyValue")}
      </span>
    )
  }

  return (
    <Input
      className={styles.editableDate}
      defaultValue={formatDateLocal(value)}
      form={formId}
      name={name}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      type="date"
    />
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

function ManualDebtDetailsDrawer({
  onOpenChange,
  row,
}: {
  onOpenChange: (open: boolean) => void
  row: LedgerReportRow | null
}) {
  const t = useI18n()
  const paymentMethodLabels: Record<PaymentMethod, string> = {
    "Chuyển khoản": t(
      "customers.ledger.paymentDialog.fields.methodOptions.bankTransfer",
    ),
    "Tiền mặt": t("customers.ledger.paymentDialog.fields.methodOptions.cash"),
    AST: t("customers.ledger.paymentDialog.fields.methodOptions.ast"),
    THF: t("customers.ledger.paymentDialog.fields.methodOptions.thf"),
  }

  return (
    <Dialog
      className={cn(styles.sideDrawer, styles.detailDrawer)}
      isOpen={row !== null}
      maxHeight="100dvh"
      onOpenChange={onOpenChange}
      padding={0}
      position={{ bottom: 0, right: 0, top: 0 }}
      purpose="info"
      width="min(32rem, 100dvw)"
    >
      {row ? (
        <Layout
          className={styles.drawerLayout}
          defaultHasDividers
          header={
            <DialogHeader
              className={styles.drawerHeader}
              onOpenChange={onOpenChange}
              subtitle={row.customer_name}
              title={
                row.passenger_names || t("manualDebts.table.detailsTitle")
              }
            />
          }
          content={
            <LayoutContent padding={4}>
              <div className={styles.detailSections}>
                <section aria-labelledby="manual-debt-detail-record">
                  <h3
                    className={styles.detailSectionTitle}
                    id="manual-debt-detail-record"
                  >
                    {t("manualDebts.table.groups.record")}
                  </h3>
                  <dl className={styles.detailGrid}>
                    <DetailItem
                      label={t("manualDebts.table.columns.customer")}
                      value={row.customer_name}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.description")}
                      value={row.passenger_names}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.bookedAt")}
                      value={
                        formatOptionalDate(row.booked_at) ||
                        t("manualDebts.emptyValue")
                      }
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.date")}
                      value={formatDate(row.created_at)}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.pnr")}
                      value={row.pnr || t("manualDebts.emptyValue")}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.ticketNumber")}
                      value={row.ticket_number || t("manualDebts.emptyValue")}
                    />
                    <DetailItem
                      label={t("manualDebts.form.fields.airline")}
                      value={row.airline || t("manualDebts.emptyValue")}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.route")}
                      value={row.route || t("manualDebts.emptyValue")}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.flightDate")}
                      value={
                        formatOptionalDate(row.flight_date) ||
                        t("manualDebts.emptyValue")
                      }
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.status")}
                      value={row.ticket_status || t("manualDebts.emptyValue")}
                    />
                  </dl>
                </section>

                <section aria-labelledby="manual-debt-detail-pricing">
                  <h3
                    className={styles.detailSectionTitle}
                    id="manual-debt-detail-pricing"
                  >
                    {t("manualDebts.table.groups.pricing")}
                  </h3>
                  <dl className={styles.detailGrid}>
                    <DetailItem
                      label={t("manualDebts.table.columns.customerPaid")}
                      numeric
                      value={formatCurrency(row.ticket_selling_price)}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.discount")}
                      numeric
                      value={formatCurrency(row.ticket_discount)}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.evPrice")}
                      numeric
                      value={formatCurrency(row.ticket_ev_price)}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.astPrice")}
                      numeric
                      value={formatCurrency(row.ticket_ast_price)}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.thfPrice")}
                      numeric
                      value={formatCurrency(row.ticket_thf_price)}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.webPrice")}
                      numeric
                      value={formatCurrency(row.ticket_web_price)}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.insurancePrice")}
                      numeric
                      value={formatCurrency(row.ticket_insurance_price)}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.income")}
                      numeric
                      value={formatCurrency(row.ticket_true_income)}
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.paymentAmount")}
                      numeric
                      value={
                        row.linked_payment_amount === null
                          ? t("manualDebts.emptyValue")
                          : formatCurrency(row.linked_payment_amount)
                      }
                    />
                    <DetailItem
                      label={t("manualDebts.table.columns.paymentMethod")}
                      value={
                        row.linked_payment_methods.length === 0
                          ? t("manualDebts.emptyValue")
                          : row.linked_payment_methods
                              .map(
                                (method) =>
                                  paymentMethodLabels[method as PaymentMethod] ??
                                  method,
                              )
                              .join(", ")
                      }
                    />
                  </dl>
                </section>

                <section aria-labelledby="manual-debt-detail-note">
                  <h3
                    className={styles.detailSectionTitle}
                    id="manual-debt-detail-note"
                  >
                    {t("manualDebts.table.columns.note")}
                  </h3>
                  <p className={styles.detailNote}>
                    {row.linked_payment_note || t("manualDebts.emptyValue")}
                  </p>
                </section>
              </div>
            </LayoutContent>
          }
        />
      ) : null}
    </Dialog>
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
  onViewDetails,
  row,
  tableView,
}: {
  onViewDetails: (row: LedgerReportRow) => void
  row: LedgerReportRow
  tableView: TableView
}) {
  const t = useI18n()
  const rowRef = React.useRef<HTMLTableRowElement>(null)
  const updateFormRef = React.useRef<HTMLFormElement>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const updateFormId = `manual-debt-update-${row.id}`
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
  const currentPaymentMethod =
    row.linked_payment_methods.length === 1
      ? row.linked_payment_methods[0]
      : row.linked_payment_methods.length === 0
        ? ticketPaymentMethod ?? ""
        : ""
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
  const paymentTransactionIds =
    row.linked_payment_transaction_ids.length > 0
      ? row.linked_payment_transaction_ids
      : row.transaction_id
        ? [row.transaction_id]
        : []
  const canEditPaymentMethod =
    row.ticket_id !== null && paymentTransactionIds.length > 0
  const currentPaymentNote = row.linked_payment_note?.trim() ?? ""

  const submitIfChanged = React.useCallback(() => {
    const form = updateFormRef.current

    if (!form) {
      return
    }

    const formData = new FormData(form)
    const nextBookedAt = String(formData.get("booked_at") ?? "")
    const nextPassengers = String(formData.get("passengers") ?? "").trim()
    const nextPaymentMethod = String(formData.get("payment_method") ?? "")
    const nextPaymentNote = String(formData.get("payment_note") ?? "").trim()
    const nextTrueIncome = parseSignedCurrencyInput(
      String(formData.get("true_income") ?? ""),
    )
    const initialValues = {
      selling_price: row.ticket_selling_price,
      discount: row.ticket_discount,
      ev_price: row.ticket_ev_price,
      ast_price: row.ticket_ast_price,
      thf_price: row.ticket_thf_price,
      web_price: row.ticket_web_price,
      insurance_price: row.ticket_insurance_price,
    }
    const hasPricingChanged = Object.entries(initialValues).some(([key, value]) => {
      const nextValue = parseCurrencyInput(String(formData.get(key) ?? ""))

      return nextValue !== value
    })
    const hasChanged = hasPricingChanged ||
      nextBookedAt !== formatDateLocal(row.booked_at) ||
      nextPassengers !== row.passenger_names.trim() ||
      nextTrueIncome !== row.ticket_true_income ||
      (canEditPaymentMethod && nextPaymentMethod !== currentPaymentMethod) ||
      (canEditPaymentMethod && nextPaymentNote !== currentPaymentNote)

    if (hasChanged) {
      const incomeOverrideInput = form.elements.namedItem("true_income_override")

      if (incomeOverrideInput instanceof HTMLInputElement) {
        incomeOverrideInput.value =
          !hasPricingChanged || nextTrueIncome !== row.ticket_true_income
            ? "true"
            : "false"
      }

      form.requestSubmit()
    }
  }, [
    canEditPaymentMethod,
    currentPaymentMethod,
    currentPaymentNote,
    row,
  ])

  const handleInputBlur: React.FocusEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (event) => {
    const nextTarget = event.relatedTarget

    if (nextTarget instanceof Node && rowRef.current?.contains(nextTarget)) {
      return
    }

    submitIfChanged()
    setIsEditing(false)
  }

  const handleInputKeyDown: React.KeyboardEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (event) => {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    submitIfChanged()
    setIsEditing(false)
    event.currentTarget.blur()
  }

  const handleNoteKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) {
      return
    }

    event.preventDefault()
    submitIfChanged()
    setIsEditing(false)
    event.currentTarget.blur()
  }

  const handleNoteChange: React.ChangeEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    const noteChangedInput = event.currentTarget.form?.elements.namedItem(
      "payment_note_changed",
    )

    if (noteChangedInput instanceof HTMLInputElement) {
      noteChangedInput.value =
        event.currentTarget.value.trim() === currentPaymentNote
          ? "false"
          : "true"
    }
  }

  const handlePaymentMethodBlur: React.FocusEventHandler<HTMLSelectElement> = (
    event,
  ) => {
    const nextTarget = event.relatedTarget

    if (nextTarget instanceof Node && rowRef.current?.contains(nextTarget)) {
      return
    }

    submitIfChanged()
    setIsEditing(false)
  }

  const handlePaymentMethodChange: React.ChangeEventHandler<HTMLSelectElement> = () => {
    submitIfChanged()
    setIsEditing(false)
  }

  const handlePaymentMethodKeyDown: React.KeyboardEventHandler<HTMLSelectElement> = (
    event,
  ) => {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    submitIfChanged()
    setIsEditing(false)
    event.currentTarget.blur()
  }

  return (
    <TableRow className={styles.tableRow} ref={rowRef}>
      <TableCell className={cn(styles.cell, styles.stickyCell)}>
        <EditableDateCell
          editing={isEditing}
          formId={updateFormId}
          name="booked_at"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          value={row.booked_at}
        />
      </TableCell>
      <TableCell
        className={cn(styles.cell, styles.stickyContextCell)}
        title={[row.passenger_names, row.customer_name]
          .filter(Boolean)
          .join(" · ")}
      >
        <div className={styles.recordContext}>
          <EditableTextCell
            ariaLabel={t("manualDebts.table.columns.description")}
            editing={isEditing}
            emptyValue={t("manualDebts.emptyValue")}
            formId={updateFormId}
            name="passengers"
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            value={row.passenger_names}
          />
          <span className={styles.customerText}>{row.customer_name}</span>
        </div>
      </TableCell>
      {tableView === "full" ? (
        <TableCell className={cn(styles.cell, styles.mutedCell)}>
          {formatDate(row.created_at)}
        </TableCell>
      ) : null}
      <TableCell className={styles.numberCell}>
        <EditableMoneyCell
          editing={isEditing}
          formId={updateFormId}
          name="selling_price"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          value={row.ticket_selling_price}
        />
      </TableCell>
      {tableView === "full" ? (
        <>
          <TableCell className={styles.numberCell}>
            <EditableMoneyCell
              editing={isEditing}
              formId={updateFormId}
              name="discount"
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              value={row.ticket_discount}
            />
          </TableCell>
          <TableCell className={styles.numberCell}>
            <EditableMoneyCell
              editing={isEditing}
              formId={updateFormId}
              name="ev_price"
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              value={row.ticket_ev_price}
            />
          </TableCell>
          <TableCell className={styles.numberCell}>
            <EditableMoneyCell
              editing={isEditing}
              formId={updateFormId}
              name="ast_price"
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              value={row.ticket_ast_price}
            />
          </TableCell>
          <TableCell className={styles.numberCell}>
            <EditableMoneyCell
              editing={isEditing}
              formId={updateFormId}
              name="thf_price"
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              value={row.ticket_thf_price}
            />
          </TableCell>
          <TableCell className={styles.numberCell}>
            <EditableMoneyCell
              editing={isEditing}
              formId={updateFormId}
              name="web_price"
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              value={row.ticket_web_price}
            />
          </TableCell>
          <TableCell className={styles.numberCell}>
            <EditableMoneyCell
              editing={isEditing}
              formId={updateFormId}
              name="insurance_price"
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              value={row.ticket_insurance_price}
            />
          </TableCell>
        </>
      ) : null}
      <TableCell className={styles.valueCell}>
        <EditableMoneyCell
          editing={isEditing}
          formId={updateFormId}
          name="true_income"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          signed
          tooltip={t("manualDebts.table.incomeAutoCalculateTooltip")}
          value={row.ticket_true_income}
        />
      </TableCell>
      {tableView === "full" ? (
        <TableCell className={styles.valueCell}>
          {row.linked_payment_amount === null
            ? ""
            : formatCurrency(row.linked_payment_amount)}
        </TableCell>
      ) : null}
      <TableCell className={styles.paymentMethodCell}>
        {!isEditing ? (
          <span className={styles.paymentMethodValue}>
            {paymentMethodDisplay}
          </span>
        ) : (
          <select
            aria-label={t("manualDebts.table.columns.paymentMethod")}
            className={cn(selectInputClassName, styles.editablePaymentMethod)}
            defaultValue={currentPaymentMethod}
            disabled={!canEditPaymentMethod}
            form={updateFormId}
            name="payment_method"
            onBlur={handlePaymentMethodBlur}
            onChange={handlePaymentMethodChange}
            onKeyDown={handlePaymentMethodKeyDown}
          >
            <option value="">
              {t("manualDebts.emptyValue")}
            </option>
            {paymentMethodOptions.map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabels[method]}
              </option>
            ))}
          </select>
        )}
      </TableCell>
      <TableCell className={styles.noteCell}>
        {isEditing ? (
          <Textarea
            aria-label={t("manualDebts.table.columns.note")}
            className={styles.editableNote}
            defaultValue={currentPaymentNote}
            form={updateFormId}
            name="payment_note"
            onBlur={handleInputBlur}
            onChange={handleNoteChange}
            onKeyDown={handleNoteKeyDown}
            rows={2}
          />
        ) : (
          row.linked_payment_note ?? ""
        )}
      </TableCell>
      <TableCell className={styles.actionsCell}>
        <div className={styles.rowActions}>
          {row.ticket_id ? (
            <>
            <form
              action={updateManualDebtRowAction}
              className={patterns.hidden}
              id={updateFormId}
              ref={updateFormRef}
            >
              <input name="customer_id" type="hidden" value={row.customer_id} />
              <input name="ticket_id" type="hidden" value={row.ticket_id} />
              <input name="true_income_override" type="hidden" value="false" />
              <input name="payment_note_changed" type="hidden" value="false" />
              {paymentTransactionIds.map((transactionId) => (
                <input
                  key={transactionId}
                  name="payment_transaction_id"
                  type="hidden"
                  value={transactionId}
                />
              ))}
              {!isEditing ? (
                <>
                  <input name="booked_at" type="hidden" value={formatDateLocal(row.booked_at)} />
                  <input name="passengers" type="hidden" value={row.passenger_names} />
                  <input name="selling_price" type="hidden" value={row.ticket_selling_price} />
                  <input name="discount" type="hidden" value={row.ticket_discount} />
                  <input name="ev_price" type="hidden" value={row.ticket_ev_price} />
                  <input name="ast_price" type="hidden" value={row.ticket_ast_price} />
                  <input name="thf_price" type="hidden" value={row.ticket_thf_price} />
                  <input name="web_price" type="hidden" value={row.ticket_web_price} />
                  <input name="insurance_price" type="hidden" value={row.ticket_insurance_price} />
                  <input name="true_income" type="hidden" value={row.ticket_true_income} />
                  <input name="payment_method" type="hidden" value={currentPaymentMethod} />
                  <input name="payment_note" type="hidden" value={currentPaymentNote} />
                </>
              ) : null}
              {isEditing && tableView === "summary" ? (
                <>
                  <input name="discount" type="hidden" value={row.ticket_discount} />
                  <input name="ev_price" type="hidden" value={row.ticket_ev_price} />
                  <input name="ast_price" type="hidden" value={row.ticket_ast_price} />
                  <input name="thf_price" type="hidden" value={row.ticket_thf_price} />
                  <input name="web_price" type="hidden" value={row.ticket_web_price} />
                  <input name="insurance_price" type="hidden" value={row.ticket_insurance_price} />
                </>
              ) : null}
            </form>
            <form
              action={deleteManualDebtRowAction}
              className={patterns.hidden}
              id={deleteFormId}
              onSubmit={(event) => {
                if (!window.confirm(t("manualDebts.table.actions.deleteConfirm"))) {
                  event.preventDefault()
                }
              }}
            >
              <input name="customer_id" type="hidden" value={row.customer_id} />
              <input name="ticket_id" type="hidden" value={row.ticket_id} />
            </form>
            </>
          ) : null}
          <Button
            aria-label={t("manualDebts.table.actions.view")}
            onClick={() => onViewDetails(row)}
            size="icon"
            title={t("manualDebts.table.actions.view")}
            type="button"
            variant="ghost"
          >
            <Eye className={patterns.iconCompact} />
          </Button>
          {row.ticket_id ? (
            <>
            <Button
              aria-label={t("manualDebts.table.actions.edit")}
              onClick={() => setIsEditing(true)}
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
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isFormDirty, setIsFormDirty] = React.useState(false)
  const [isSubmitPending, setIsSubmitPending] = React.useState(false)
  const [selectedRow, setSelectedRow] = React.useState<LedgerReportRow | null>(
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
    setReportRows(initialPage.items)
    setReportPagination(initialPage.pagination)
    setAppliedSearch("")
    setSearchValue("")
    setRowsError(null)
  }, [initialPage])

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
                        label={t("manualDebts.table.columns.date")}
                        onSort={handleSort}
                        sortKey="createdAt"
                        sortState={sortState}
                      >
                        {t("manualDebts.table.columns.date")}
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
                        onViewDetails={setSelectedRow}
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
      <ManualDebtDetailsDrawer
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRow(null)
          }
        }}
        row={selectedRow}
      />
    </div>
  )
}
