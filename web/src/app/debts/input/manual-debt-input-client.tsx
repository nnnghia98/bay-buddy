"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  ChevronsUpDown,
  CheckCircle2,
  CircleDollarSign,
  Filter,
  Pencil,
  Loader2,
  Plus,
  ReceiptText,
  Route,
  Trash2,
  Wallet,
} from "lucide-react"

import {
  deleteManualDebtRowAction,
  updateManualDebtRowAction,
} from "@/actions/manual-debt"
import {
  EmptyState,
  Panel,
} from "@/components/command-center"
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
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/lib/formatters"
import type { LedgerReportRow } from "@/lib/server-report"
import { cn } from "@/lib/utils"
import {
  AIRLINE_LABELS,
  initialManualDebtActionState,
  paymentMethodOptions,
  type Airline,
  type CustomerDirectoryItem,
  type ManualDebtActionState,
  type ManualDebtFormValues,
  type PaymentMethod,
} from "@/schemas"
import { useI18n } from "@/locales/client"

type ManualDebtInputClientProps = {
  customers: CustomerDirectoryItem[]
  rows: LedgerReportRow[]
}

type ManualDebtField = keyof ManualDebtFormValues

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

function parseDateFilter(value: string, boundary: "start" | "end"): Date | null {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return null
  }

  return boundary === "start"
    ? new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0))
    : new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999))
}

function getFieldError(
  fieldErrors: Partial<Record<ManualDebtField, string>>,
  field: ManualDebtField,
): string | undefined {
  return fieldErrors[field]
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("vi-VN")
}

function FormField({
  children,
  error,
  label,
  htmlFor,
}: {
  children: React.ReactNode
  error?: string
  label: string
  htmlFor: string
}) {
  return (
    <div className="space-y-1.5">
      <Label
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        htmlFor={htmlFor}
      >
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
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
}: {
  customers: CustomerDirectoryItem[]
  id: string
  name: string
  noResultsLabel: string
  placeholder: string
}) {
  const listboxId = React.useId()
  const [value, setValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)

  const matchingCustomers = React.useMemo(() => {
    const normalizedValue = normalizeSearch(value)
    const source = normalizedValue
      ? customers.filter((customer) => {
          const normalizedName = normalizeSearch(customer.full_name)
          const normalizedPhone = normalizeSearch(customer.phone ?? "")

          return (
            normalizedName.includes(normalizedValue) ||
            normalizedPhone.includes(normalizedValue)
          )
        })
      : customers

    return source.slice(0, 8)
  }, [customers, value])

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
    <div className="relative">
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
        value={value}
      />
      <ChevronsUpDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      {isOpen ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-lg border border-border bg-white shadow-[var(--shadow-md)]"
          id={listboxId}
          role="listbox"
        >
          {hasMatches ? (
            matchingCustomers.map((customer, index) => (
              <button
                aria-selected={index === activeIndex}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors",
                  index === activeIndex
                    ? "bg-accent text-foreground"
                    : "text-foreground hover:bg-accent/65",
                )}
                key={customer.id}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectCustomer(customer)
                }}
                role="option"
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {customer.full_name}
                  </span>
                  {customer.phone ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {customer.phone}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {formatCurrency(customer.current_balance)}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3.5 py-3 text-sm text-muted-foreground">
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
    <div className="relative">
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
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      {isOpen ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-lg border border-border bg-white shadow-[var(--shadow-md)]"
          id={listboxId}
          role="listbox"
        >
          {hasMatches ? (
            matchingAirlines.map(([code, label], index) => (
              <button
                aria-selected={index === activeIndex}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors",
                  index === activeIndex
                    ? "bg-accent text-foreground"
                    : "text-foreground hover:bg-accent/65",
                )}
                key={code}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectAirline(code, label)
                }}
                role="option"
                type="button"
              >
                <span className="font-medium text-foreground">{label}</span>
                <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground">
                  {code}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3.5 py-3 text-sm text-muted-foreground">
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
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={onSubmit}
      type="button"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
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
    <div className="rounded-lg border border-border/80 bg-secondary/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-primary shadow-[var(--shadow-sm)]">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          {title}
        </p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function EditableMoneyCell({
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
  value: number
}) {
  if (!editing) {
    return (
      <span className="block text-right text-sm font-semibold text-foreground">
        {formatCurrency(value)}
      </span>
    )
  }

  return (
    <Input
      className="ml-auto h-9 w-32 text-right font-semibold"
      defaultValue={formatCurrencyInput(value)}
      form={formId}
      inputMode="numeric"
      min={0}
      name={name}
      onBlur={onBlur}
      onChange={(event) => {
        event.target.value = formatCurrencyInput(event.target.value)
      }}
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
      <span className="block text-sm text-foreground">
        {formatOptionalDate(value) || t("manualDebts.emptyValue")}
      </span>
    )
  }

  return (
    <Input
      className="h-9 min-w-52"
      defaultValue={formatDateLocal(value)}
      form={formId}
      name={name}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      type="date"
    />
  )
}

function ManualDebtTableRow({
  row,
}: {
  row: LedgerReportRow
}) {
  const t = useI18n()
  const rowRef = React.useRef<HTMLTableRowElement>(null)
  const updateFormRef = React.useRef<HTMLFormElement>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const updateFormId = `manual-debt-update-${row.id}`
  const deleteFormId = `manual-debt-delete-${row.id}`

  const submitIfChanged = React.useCallback(() => {
    const form = updateFormRef.current

    if (!form) {
      return
    }

    const formData = new FormData(form)
    const nextBookedAt = String(formData.get("booked_at") ?? "")
    const initialValues = {
      selling_price: row.ticket_selling_price,
      discount: row.ticket_discount,
      ev_price: row.ticket_ev_price,
      ast_price: row.ticket_ast_price,
      thf_price: row.ticket_thf_price,
      web_price: row.ticket_web_price,
      insurance_price: row.ticket_insurance_price,
    }
    const hasChanged = Object.entries(initialValues).some(([key, value]) => {
      const nextValue = parseCurrencyInput(String(formData.get(key) ?? ""))

      return nextValue !== value
    }) || nextBookedAt !== formatDateLocal(row.booked_at)

    if (hasChanged) {
      form.requestSubmit()
    }
  }, [row])

  const handleInputBlur: React.FocusEventHandler<HTMLInputElement> = (event) => {
    const nextTarget = event.relatedTarget

    if (nextTarget instanceof Node && rowRef.current?.contains(nextTarget)) {
      return
    }

    submitIfChanged()
    setIsEditing(false)
  }

  const handleInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    submitIfChanged()
    setIsEditing(false)
    event.currentTarget.blur()
  }

  return (
    <TableRow className="hover:bg-accent/35" ref={rowRef}>
      <TableCell className="sticky left-0 z-10 min-w-40 whitespace-nowrap border-r border-border bg-white px-5 py-3.5 text-sm shadow-[8px_0_14px_rgba(24,29,38,0.035)]">
        <EditableDateCell
          editing={isEditing}
          formId={updateFormId}
          name="booked_at"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          value={row.booked_at}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-5 py-3.5 text-sm text-muted-foreground">
        {formatDate(row.created_at)}
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-5 py-3.5 text-sm font-medium">
        {row.passenger_names}
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-3 py-2 text-right">
        <EditableMoneyCell
          editing={isEditing}
          formId={updateFormId}
          name="selling_price"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          value={row.ticket_selling_price}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-3 py-2 text-right">
        <EditableMoneyCell
          editing={isEditing}
          formId={updateFormId}
          name="discount"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          value={row.ticket_discount}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-3 py-2 text-right">
        <EditableMoneyCell
          editing={isEditing}
          formId={updateFormId}
          name="ev_price"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          value={row.ticket_ev_price}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-3 py-2 text-right">
        <EditableMoneyCell
          editing={isEditing}
          formId={updateFormId}
          name="ast_price"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          value={row.ticket_ast_price}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-3 py-2 text-right">
        <EditableMoneyCell
          editing={isEditing}
          formId={updateFormId}
          name="thf_price"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          value={row.ticket_thf_price}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-3 py-2 text-right">
        <EditableMoneyCell
          editing={isEditing}
          formId={updateFormId}
          name="web_price"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          value={row.ticket_web_price}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-3 py-2 text-right">
        <EditableMoneyCell
          editing={isEditing}
          formId={updateFormId}
          name="insurance_price"
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          value={row.ticket_insurance_price}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-5 py-3.5 text-right text-sm font-semibold">
        {formatCurrency(row.ticket_true_income)}
      </TableCell>
      <TableCell className="whitespace-nowrap border-r border-border bg-white px-5 py-3.5 text-right text-sm font-semibold">
        {row.linked_payment_amount === null
          ? ""
          : formatCurrency(row.linked_payment_amount)}
      </TableCell>
      <TableCell className="min-w-64 max-w-80 whitespace-normal border-r border-border bg-white px-5 py-3.5 text-sm text-muted-foreground">
        {row.linked_payment_note ?? ""}
      </TableCell>
      <TableCell className="sticky right-0 z-10 w-[104px] min-w-[104px] whitespace-nowrap bg-white px-3 py-3.5 text-right shadow-[-8px_0_14px_rgba(24,29,38,0.04)]">
        {row.ticket_id ? (
          <div className="flex justify-end gap-2">
            <form
              action={updateManualDebtRowAction}
              className="hidden"
              id={updateFormId}
              ref={updateFormRef}
            >
              <input name="customer_id" type="hidden" value={row.customer_id} />
              <input name="ticket_id" type="hidden" value={row.ticket_id} />
              {!isEditing ? (
                <>
                  <input name="booked_at" type="hidden" value={formatDateLocal(row.booked_at)} />
                  <input name="selling_price" type="hidden" value={row.ticket_selling_price} />
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
              className="hidden"
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
            <Button
              aria-label={t("manualDebts.table.actions.edit")}
              className="h-9 w-9 px-0"
              onClick={() => setIsEditing(true)}
              size="sm"
              title={t("manualDebts.table.actions.edit")}
              type="button"
              variant="outline"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              aria-label={t("manualDebts.table.actions.delete")}
              className="h-9 w-9 bg-red-600 px-0 text-white hover:bg-red-700"
              form={deleteFormId}
              size="sm"
              title={t("manualDebts.table.actions.delete")}
              type="submit"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          t("manualDebts.emptyValue")
        )}
      </TableCell>
    </TableRow>
  )
}

function TableHorizontalControls({
  scrollContainerRef,
}: {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
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

    return () => {
      container.removeEventListener("scroll", updateScrollState)
      resizeObserver.disconnect()
    }
  }, [scrollContainerRef, updateScrollState])

  const scrollTable = (direction: -1 | 1) => {
    const container = scrollContainerRef.current

    if (!container) {
      return
    }

    container.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(container.clientWidth * 0.7, 320),
    })
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-2.5">
      <p className="min-w-0 text-xs text-muted-foreground">
        {t("manualDebts.table.horizontalScrollHint")}
      </p>
      <div
        aria-label={t("manualDebts.table.horizontalScrollControls")}
        className="flex shrink-0 items-center gap-1.5"
        role="group"
      >
        <Button
          aria-label={t("manualDebts.table.scrollLeft")}
          className="h-8 w-8 px-0"
          disabled={!canScrollLeft}
          onClick={() => scrollTable(-1)}
          title={t("manualDebts.table.scrollLeft")}
          type="button"
          variant="outline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          aria-label={t("manualDebts.table.scrollRight")}
          className="h-8 w-8 px-0"
          disabled={!canScrollRight}
          onClick={() => scrollTable(1)}
          title={t("manualDebts.table.scrollRight")}
          type="button"
          variant="outline"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function ManualDebtInputClient({
  customers,
  rows,
}: ManualDebtInputClientProps) {
  const t = useI18n()
  const router = useRouter()
  const formRef = React.useRef<HTMLFormElement>(null)
  const tableScrollRef = React.useRef<HTMLDivElement>(null)
  const [isSubmitPending, setIsSubmitPending] = React.useState(false)
  const [actionState, setActionState] = React.useState<ManualDebtActionState>(
    initialManualDebtActionState,
  )
  const [fromValue, setFromValue] = React.useState("")
  const [toValue, setToValue] = React.useState("")
  const [appliedFrom, setAppliedFrom] = React.useState("")
  const [appliedTo, setAppliedTo] = React.useState("")
  const [filterError, setFilterError] = React.useState<string | null>(null)
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

  React.useEffect(() => {
    if (actionState.status !== "success") {
      return
    }

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
    setFormResetKey((current) => current + 1)
    router.refresh()
  }, [actionState.status, actionState.submittedAt, router])

  const filteredRows = React.useMemo(() => {
    const fromDate = parseDateFilter(appliedFrom, "start")
    const toDate = parseDateFilter(appliedTo, "end")

    return rows.filter((row) => {
      const rowDate = new Date(row.created_at)

      if (fromDate && rowDate < fromDate) {
        return false
      }

      if (toDate && rowDate > toDate) {
        return false
      }

      return true
    })
  }, [appliedFrom, appliedTo, rows])

  const trueIncome =
    sellingPrice + discount - (evPrice + astPrice + thfPrice + webPrice + insurancePrice)
  const fieldErrors = actionState.fieldErrors

  const handleApplyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFilterError(null)

    const fromDate = parseDateFilter(fromValue, "start")
    const toDate = parseDateFilter(toValue, "start")

    if (fromDate && toDate && fromDate > toDate) {
      setFilterError(t("manualDebts.filters.invalidRange"))
      return
    }

    setAppliedFrom(fromValue)
    setAppliedTo(toValue)
  }

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
    <div className="space-y-6 pb-12 text-foreground">
      <div className="grid gap-4 lg:grid-cols-[7fr_13fr] lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-6 lg:h-[calc(100dvh-8rem)]">
          <Panel className="lg:h-full">
            <form
              className="flex flex-col lg:h-full"
              key={formResetKey}
              onSubmit={handleManualDebtSubmit}
              ref={formRef}
            >
              <div className="flex justify-end border-b border-border bg-white p-4">
                <SubmitButton
                  onSubmit={dispatchManualDebtAction}
                  pending={isSubmitPending}
                />
              </div>

              <div className="space-y-4 p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                {actionState.message ? (
                  <div
                    className={cn(
                      "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                      actionState.status === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700",
                    )}
                    role={actionState.status === "error" ? "alert" : "status"}
                  >
                    {actionState.status === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : null}
                    <span>{actionState.message}</span>
                  </div>
                ) : null}

                <div className="grid gap-4">
                  <FormField
                    error={getFieldError(fieldErrors, "customer_name")}
                    htmlFor="manual-debt-customer"
                    label={t("manualDebts.form.fields.customer")}
                  >
                    <CustomerAutocomplete
                      customers={customers}
                      id="manual-debt-customer"
                      name="customer_name"
                      noResultsLabel={t("manualDebts.form.customerNoResults")}
                      placeholder={t("manualDebts.form.customerPlaceholder")}
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
                      className="min-h-24"
                      id="manual-debt-passengers"
                      name="passengers"
                    />
                  </FormField>
                </div>

                <FormSection
                  icon={CircleDollarSign}
                  title={t("manualDebts.form.pricingGroup")}
                >
                  <div className="grid gap-4">
                    <input name="net_price" type="hidden" value="0" />
                    <div className="grid gap-4 sm:grid-cols-2">
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
                    <div className="rounded-lg border border-primary/15 bg-white p-3 shadow-[inset_0_1px_0_rgba(27,97,201,0.08)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {t("manualDebts.table.columns.income")}
                      </p>
                      <p className="mt-1 text-lg font-semibold tracking-normal text-foreground tabular-nums">
                        {formatCurrency(trueIncome)}
                      </p>
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  icon={Wallet}
                  title={t("manualDebts.form.paymentGroup")}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
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
                        className="flex h-11 w-full rounded-md border border-input bg-white px-3.5 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] transition-all focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
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
                  <div className="mt-4">
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
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
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
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
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

                  <div className="grid gap-4 sm:grid-cols-2">
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
          </Panel>
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:h-[calc(100dvh-8rem)]">
          <Panel className="min-w-0 lg:flex lg:h-full lg:flex-col">
            <div className="shrink-0 border-b border-border bg-white p-4">
              <form
                className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                onSubmit={handleApplyFilters}
              >
                <div className="space-y-1.5">
                  <Label
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                    htmlFor="manual-debt-from"
                  >
                    {t("manualDebts.filters.from")}
                  </Label>
                  <Input
                    id="manual-debt-from"
                    onChange={(event) => setFromValue(event.target.value)}
                    type="date"
                    value={fromValue}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                    htmlFor="manual-debt-to"
                  >
                    {t("manualDebts.filters.to")}
                  </Label>
                  <Input
                    id="manual-debt-to"
                    onChange={(event) => setToValue(event.target.value)}
                    type="date"
                    value={toValue}
                  />
                </div>
                <Button className="self-end" type="submit" variant="outline">
                  <Filter className="h-4 w-4" />
                  {t("manualDebts.filters.apply")}
                </Button>
              </form>
            </div>
            {filterError ? (
              <p
                className="border-b border-border px-5 py-3 text-sm text-red-600"
                role="alert"
              >
                {filterError}
              </p>
            ) : null}
            <TableHorizontalControls scrollContainerRef={tableScrollRef} />
            <div className="min-h-0 flex-1">
              <Table
                className="min-w-[1900px] border-collapse"
                containerClassName="lg:h-full"
                containerRef={tableScrollRef}
              >
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                    <TableHead className="sticky left-0 z-30 min-w-40 whitespace-nowrap border-r border-border bg-sidebar-accent px-5 py-3.5 font-semibold text-foreground shadow-[8px_0_14px_rgba(24,29,38,0.035)]">
                      {t("manualDebts.table.columns.bookedAt")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 font-semibold text-foreground">
                      {t("manualDebts.table.columns.date")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 font-semibold text-foreground">
                      {t("manualDebts.table.columns.description")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 text-right font-semibold text-foreground">
                      {t("manualDebts.table.columns.customerPaid")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 text-right font-semibold text-foreground">
                      {t("manualDebts.table.columns.discount")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 text-right font-semibold text-foreground">
                      {t("manualDebts.table.columns.evPrice")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 text-right font-semibold text-foreground">
                      {t("manualDebts.table.columns.astPrice")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 text-right font-semibold text-foreground">
                      {t("manualDebts.table.columns.thfPrice")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 text-right font-semibold text-foreground">
                      {t("manualDebts.table.columns.webPrice")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 text-right font-semibold text-foreground">
                      {t("manualDebts.table.columns.insurancePrice")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 text-right font-semibold text-foreground">
                      {t("manualDebts.table.columns.income")}
                    </TableHead>
                    <TableHead className="whitespace-nowrap border-r border-border px-5 py-3.5 text-right font-semibold text-foreground">
                      {t("manualDebts.table.columns.payment")}
                    </TableHead>
                    <TableHead className="min-w-64 whitespace-nowrap border-r border-border px-5 py-3.5 font-semibold text-foreground">
                      {t("manualDebts.table.columns.note")}
                    </TableHead>
                    <TableHead className="sticky right-0 z-30 w-[104px] min-w-[104px] whitespace-nowrap bg-sidebar-accent px-3 py-3.5 text-right font-semibold text-foreground shadow-[-8px_0_14px_rgba(24,29,38,0.04)]">
                      {t("manualDebts.table.columns.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14}>
                        <EmptyState
                          icon={ReceiptText}
                          message={t("manualDebts.table.empty")}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <ManualDebtTableRow key={row.id} row={row} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
