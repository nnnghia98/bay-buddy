"use client"

import * as React from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { updateTicketLedgerRecordAction, type LedgerCorrectionActionState } from "@/actions/finance"
import {
  initialTicketLifecycleActionState,
  reassignTicketAction,
  refundTicketAction,
  voidTicketAction,
  type TicketLifecycleActionState,
} from "@/actions/tickets"
import { StatusChip } from "@/components/command-center"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import type { CustomerDirectoryItem, TicketRead } from "@/schemas"

type TicketDetailClientProps = {
  currentUserRole: "ADMIN" | "STAFF"
  customers: CustomerDirectoryItem[]
  ticket: TicketRead
}

const initialLedgerCorrectionActionState: LedgerCorrectionActionState = {
  status: "idle",
  fieldErrors: {},
}

function formatDateTime(value: Date): string {
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

function getTicketRoute(ticket: TicketRead): string {
  if (ticket.departure_code && ticket.arrival_code) {
    return `${ticket.departure_code}-${ticket.arrival_code}`
  }

  return ticket.itinerary ?? "-"
}

function getStatusTone(status: TicketRead["status"]): "neutral" | "info" | "warning" | "success" | "danger" {
  if (status === "CONFIRMED") return "success"
  if (status === "REFUNDED") return "info"
  if (status === "VOID") return "danger"
  return "warning"
}

function LifecycleSubmitButton({
  idleLabel,
  pendingLabel,
  variant = "default",
  disabled = false,
}: {
  idleLabel: string
  pendingLabel: string
  variant?: "default" | "outline" | "destructive"
  disabled?: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <Button disabled={pending || disabled} type="submit" variant={variant}>
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

function useActionToast(
  state: TicketLifecycleActionState | LedgerCorrectionActionState,
  successFallback: string,
  errorFallback: string,
) {
  const router = useRouter()

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? successFallback)
      router.refresh()
      return
    }

    if (state.status === "error" && state.submittedAt) {
      toast.error(state.message ?? errorFallback)
    }
  }, [errorFallback, router, state, successFallback])
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-white p-4", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}

function TicketCorrectionForm({ ticket }: { ticket: TicketRead }) {
  const t = useI18n()
  const [state, formAction] = useActionState(
    updateTicketLedgerRecordAction,
    initialLedgerCorrectionActionState,
  )
  const fieldError = (field: string) => state.fieldErrors[field]
  const selectClassName =
    "flex h-11 w-full rounded-lg border border-input bg-white px-3.5 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary"

  useActionToast(
    state,
    t("customers.ledger.corrections.updateSuccess"),
    t("customers.ledger.corrections.failure"),
  )

  return (
    <section className="rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t("tickets.detail.adminEyebrow")}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">
          {t("tickets.detail.correctionTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("tickets.detail.correctionDescription")}
        </p>
      </div>

      <form action={formAction} className="mt-5 space-y-5">
        <input name="customer_id" type="hidden" value={ticket.customer_id} />
        <input name="ticket_id" type="hidden" value={ticket.id} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-pnr">
              {t("customers.ledger.corrections.fields.pnr")}
            </Label>
            <Input id="ticket-detail-pnr" name="pnr" defaultValue={ticket.pnr} />
            {fieldError("pnr") ? (
              <p className="text-sm text-red-600">{fieldError("pnr")}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-ticket-number">
              {t("customers.ledger.corrections.fields.ticketNumber")}
            </Label>
            <Input
              id="ticket-detail-ticket-number"
              name="ticket_number"
              defaultValue={ticket.ticket_number ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-airline">
              {t("customers.ledger.corrections.fields.airline")}
            </Label>
            <select
              className={selectClassName}
              id="ticket-detail-airline"
              name="airline"
              defaultValue={ticket.airline ?? ""}
            >
              <option value="">{t("manualDebts.form.chooseAirline")}</option>
              {["VNA", "VJ", "QH", "VU"].map((airline) => (
                <option key={airline} value={airline}>
                  {airline}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-flight-date">
              {t("customers.ledger.corrections.fields.flightDate")}
            </Label>
            <Input
              id="ticket-detail-flight-date"
              name="flight_date"
              type="datetime-local"
              defaultValue={formatDateTimeLocal(ticket.flight_date)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ticket-detail-passengers">
            {t("customers.ledger.corrections.fields.passengers")}
          </Label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-input bg-white px-3.5 py-2 text-sm shadow-[var(--shadow-sm)] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            id="ticket-detail-passengers"
            name="passengers"
            defaultValue={ticket.passengers.join("\n")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-departure-place">
              {t("customers.ledger.corrections.fields.departurePlace")}
            </Label>
            <Input
              id="ticket-detail-departure-place"
              name="departure_place"
              defaultValue={ticket.departure_place ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-arrival-place">
              {t("customers.ledger.corrections.fields.arrivalPlace")}
            </Label>
            <Input
              id="ticket-detail-arrival-place"
              name="arrival_place"
              defaultValue={ticket.arrival_place ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-departure-code">
              {t("customers.ledger.corrections.fields.departureCode")}
            </Label>
            <Input
              id="ticket-detail-departure-code"
              name="departure_code"
              defaultValue={ticket.departure_code ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-arrival-code">
              {t("customers.ledger.corrections.fields.arrivalCode")}
            </Label>
            <Input
              id="ticket-detail-arrival-code"
              name="arrival_code"
              defaultValue={ticket.arrival_code ?? ""}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-net-price">
              {t("customers.ledger.corrections.fields.netPrice")}
            </Label>
            <Input
              id="ticket-detail-net-price"
              name="net_price"
              type="number"
              min="0"
              defaultValue={ticket.net_price}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-ev-price">
              {t("customers.ledger.corrections.fields.evPrice")}
            </Label>
            <Input
              id="ticket-detail-ev-price"
              name="ev_price"
              type="number"
              min="0"
              defaultValue={ticket.ev_price}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-ast-price">
              {t("customers.ledger.corrections.fields.astPrice")}
            </Label>
            <Input
              id="ticket-detail-ast-price"
              name="ast_price"
              type="number"
              min="0"
              defaultValue={ticket.ast_price}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-thf-price">
              {t("customers.ledger.corrections.fields.thfPrice")}
            </Label>
            <Input
              id="ticket-detail-thf-price"
              name="thf_price"
              type="number"
              min="0"
              defaultValue={ticket.thf_price}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-web-price">
              {t("customers.ledger.corrections.fields.webPrice")}
            </Label>
            <Input
              id="ticket-detail-web-price"
              name="web_price"
              type="number"
              min="0"
              defaultValue={ticket.web_price}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-insurance-price">
              {t("customers.ledger.corrections.fields.insurancePrice")}
            </Label>
            <Input
              id="ticket-detail-insurance-price"
              name="insurance_price"
              type="number"
              min="0"
              defaultValue={ticket.insurance_price}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-selling-price">
              {t("customers.ledger.corrections.fields.sellingPrice")}
            </Label>
            <Input
              id="ticket-detail-selling-price"
              name="selling_price"
              type="number"
              min="0"
              defaultValue={ticket.selling_price}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-detail-discount">
              {t("customers.ledger.corrections.fields.discount")}
            </Label>
            <Input
              id="ticket-detail-discount"
              name="discount"
              type="number"
              min="0"
              defaultValue={ticket.discount}
            />
          </div>
        </div>

        {state.status === "error" && state.message ? (
          <p role="alert" className="text-sm text-red-600">
            {state.message}
          </p>
        ) : null}

        <div className="flex justify-end">
          <LifecycleSubmitButton
            idleLabel={t("customers.ledger.corrections.save")}
            pendingLabel={t("customers.ledger.corrections.saving")}
          />
        </div>
      </form>
    </section>
  )
}

export function TicketDetailClient({
  currentUserRole,
  customers,
  ticket,
}: TicketDetailClientProps) {
  const t = useI18n()
  const route = getTicketRoute(ticket)
  const availableCustomers = customers.filter(
    (customer) => customer.id !== ticket.customer_id,
  )
  const [voidState, voidAction] = useActionState(
    voidTicketAction,
    initialTicketLifecycleActionState,
  )
  const [refundState, refundAction] = useActionState(
    refundTicketAction,
    initialTicketLifecycleActionState,
  )
  const [reassignState, reassignAction] = useActionState(
    reassignTicketAction,
    initialTicketLifecycleActionState,
  )
  const canChangeLifecycle = ticket.status === "CONFIRMED"
  const selectClassName =
    "flex h-11 w-full rounded-lg border border-input bg-white px-3.5 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary"

  useActionToast(
    voidState,
    t("tickets.actions.voidSuccess"),
    t("tickets.actions.voidFailure"),
  )
  useActionToast(
    refundState,
    t("tickets.actions.refundSuccess"),
    t("tickets.actions.refundFailure"),
  )
  useActionToast(
    reassignState,
    t("tickets.actions.reassignSuccess"),
    t("tickets.actions.reassignFailure"),
  )

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("tickets.detail.eyebrow")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                {ticket.pnr}
              </h1>
              <StatusChip tone={getStatusTone(ticket.status)}>
                {t(`tickets.statuses.${ticket.status}`)}
              </StatusChip>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {t("tickets.detail.description")}
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href={`/customers/${ticket.customer_id}`}>
              {t("tickets.detail.openCustomer")}
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem label={t("tickets.detail.metrics.route")} value={route} />
          <DetailItem
            label={t("tickets.detail.metrics.flightDate")}
            value={formatDateTime(ticket.flight_date)}
          />
          <DetailItem
            label={t("tickets.detail.metrics.sellingPrice")}
            value={formatCurrency(ticket.selling_price)}
          />
          <DetailItem
            label={t("tickets.detail.metrics.trueIncome")}
            value={formatCurrency(ticket.true_income)}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("tickets.detail.ticketInfoEyebrow")}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">
              {t("tickets.detail.ticketInfoTitle")}
            </h2>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailItem label={t("tickets.detail.fields.ticketNumber")} value={ticket.ticket_number ?? t("tickets.detail.emptyValue")} />
            <DetailItem label={t("tickets.detail.fields.airline")} value={ticket.airline ?? t("tickets.detail.emptyValue")} />
            <DetailItem label={t("tickets.detail.fields.departure")} value={`${ticket.departure_place ?? t("tickets.detail.emptyValue")} (${ticket.departure_code ?? "-"})`} />
            <DetailItem label={t("tickets.detail.fields.arrival")} value={`${ticket.arrival_place ?? t("tickets.detail.emptyValue")} (${ticket.arrival_code ?? "-"})`} />
            <DetailItem label={t("tickets.detail.fields.netPrice")} value={formatCurrency(ticket.net_price)} />
            <DetailItem label={t("tickets.detail.fields.evPrice")} value={formatCurrency(ticket.ev_price)} />
            <DetailItem label={t("tickets.detail.fields.astPrice")} value={formatCurrency(ticket.ast_price)} />
            <DetailItem label={t("tickets.detail.fields.thfPrice")} value={formatCurrency(ticket.thf_price)} />
            <DetailItem label={t("tickets.detail.fields.webPrice")} value={formatCurrency(ticket.web_price)} />
            <DetailItem label={t("tickets.detail.fields.insurancePrice")} value={formatCurrency(ticket.insurance_price)} />
            <DetailItem label={t("tickets.detail.fields.discount")} value={formatCurrency(ticket.discount)} />
            <DetailItem label={t("tickets.detail.fields.serviceFee")} value={formatCurrency(ticket.service_fee)} />
            <DetailItem label={t("tickets.detail.fields.updatedAt")} value={formatDateTime(ticket.updated_at)} />
          </div>

          <div className="mt-3 rounded-lg border border-border bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("tickets.detail.fields.passengers")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ticket.passengers.map((passenger) => (
                <span
                  className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground"
                  key={passenger}
                >
                  {passenger}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("tickets.detail.actionsEyebrow")}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">
              {t("tickets.detail.actionsTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("tickets.detail.actionsDescription")}
            </p>

            <div className="mt-5 space-y-4">
              <form action={voidAction} className="rounded-lg border border-border bg-secondary/30 p-4">
                <input name="ticket_id" type="hidden" value={ticket.id} />
                <input name="customer_id" type="hidden" value={ticket.customer_id} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("tickets.actions.voidTitle")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("tickets.actions.voidDescription")}
                    </p>
                  </div>
                  <LifecycleSubmitButton
                    disabled={!canChangeLifecycle}
                    idleLabel={t("tickets.actions.voidSubmit")}
                    pendingLabel={t("tickets.actions.pending")}
                    variant="outline"
                  />
                </div>
              </form>

              <form action={refundAction} className="rounded-lg border border-border bg-secondary/30 p-4">
                <input name="ticket_id" type="hidden" value={ticket.id} />
                <input name="customer_id" type="hidden" value={ticket.customer_id} />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("tickets.actions.refundTitle")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("tickets.actions.refundDescription")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                    <Input
                      aria-label={t("tickets.actions.refundAmount")}
                      defaultValue={ticket.selling_price}
                      min="1"
                      name="amount"
                      type="number"
                    />
                    <LifecycleSubmitButton
                      disabled={!canChangeLifecycle}
                      idleLabel={t("tickets.actions.refundSubmit")}
                      pendingLabel={t("tickets.actions.pending")}
                    />
                  </div>
                  {refundState.fieldErrors.amount ? (
                    <p className="text-sm text-red-600">{refundState.fieldErrors.amount}</p>
                  ) : null}
                </div>
              </form>

              <form action={reassignAction} className="rounded-lg border border-border bg-secondary/30 p-4">
                <input name="ticket_id" type="hidden" value={ticket.id} />
                <input name="customer_id" type="hidden" value={ticket.customer_id} />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("tickets.actions.reassignTitle")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("tickets.actions.reassignDescription")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <select
                      aria-label={t("tickets.actions.reassignCustomer")}
                      className={selectClassName}
                      name="new_customer_id"
                      defaultValue={availableCustomers[0]?.id ?? ""}
                    >
                      {availableCustomers.length === 0 ? (
                        <option value="">
                          {t("tickets.actions.noReassignCustomers")}
                        </option>
                      ) : (
                        availableCustomers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.full_name}
                          </option>
                        ))
                      )}
                    </select>
                    <LifecycleSubmitButton
                      disabled={!canChangeLifecycle || availableCustomers.length === 0}
                      idleLabel={t("tickets.actions.reassignSubmit")}
                      pendingLabel={t("tickets.actions.pending")}
                      variant="outline"
                    />
                  </div>
                  {reassignState.fieldErrors.new_customer_id ? (
                    <p className="text-sm text-red-600">
                      {reassignState.fieldErrors.new_customer_id}
                    </p>
                  ) : null}
                </div>
              </form>
            </div>
          </section>
        </aside>
      </section>

      <section className="rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t("tickets.detail.timestampsEyebrow")}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailItem
            label={t("tickets.detail.fields.createdAt")}
            value={formatDateTime(ticket.created_at)}
          />
          <DetailItem
            label={t("tickets.detail.fields.updatedAt")}
            value={formatDateTime(ticket.updated_at)}
          />
        </div>
      </section>

      {currentUserRole === "ADMIN" ? <TicketCorrectionForm ticket={ticket} /> : null}

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/report">
            {t("tickets.detail.openReport")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
