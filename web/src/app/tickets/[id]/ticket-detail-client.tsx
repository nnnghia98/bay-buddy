"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { useActionState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"

import { updateTicketLedgerRecordAction, type LedgerCorrectionActionState } from "@/actions/finance"
import {
  initialTicketLifecycleActionState,
  reassignTicketAction,
  refundTicketAction,
  voidTicketAction,
  type TicketLifecycleActionState,
} from "@/actions/tickets"
import { Panel, StatusChip } from "@/components/command-center"
import { ActionSubmitButton } from "@/components/form-submit-button"
import { DetailField, selectInputClassName } from "@/components/operations-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/formatters"
import { useI18n } from "@/locales/client"
import type { CustomerDirectoryItem, TicketRead } from "@/schemas"
import styles from "./ticket-detail.module.css"

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
  return (
    <ActionSubmitButton disabled={disabled} idleLabel={idleLabel} pendingLabel={pendingLabel} variant={variant} />
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
    <DetailField
      className={className}
      label={label}
      labelMuted
      value={value}
    />
  )
}

function TicketCorrectionForm({ ticket }: { ticket: TicketRead }) {
  const t = useI18n()
  const [state, formAction] = useActionState(
    updateTicketLedgerRecordAction,
    initialLedgerCorrectionActionState,
  )
  const fieldError = (field: string) => state.fieldErrors[field]

  useActionToast(
    state,
    t("customers.ledger.corrections.updateSuccess"),
    t("customers.ledger.corrections.failure"),
  )

  return (
    <Panel className={styles.panel}>
      <div>
        <p className={patterns.accentEyebrow}>
          {t("tickets.detail.adminEyebrow")}
        </p>
        <h2 className={styles.sectionTitle}>
          {t("tickets.detail.correctionTitle")}
        </h2>
        <p className={patterns.mutedText}>
          {t("tickets.detail.correctionDescription")}
        </p>
      </div>

      <form action={formAction} className={styles.form}>
        <input name="customer_id" type="hidden" value={ticket.customer_id} />
        <input name="ticket_id" type="hidden" value={ticket.id} />

        <div className={patterns.fourColumnGrid}>
          <div className={patterns.fieldStack}>
            <Label htmlFor="ticket-detail-pnr">
              {t("customers.ledger.corrections.fields.pnr")}
            </Label>
            <Input id="ticket-detail-pnr" name="pnr" defaultValue={ticket.pnr ?? ""} />
            {fieldError("pnr") ? (
              <p className={patterns.errorText}>{fieldError("pnr")}</p>
            ) : null}
          </div>
          <div className={patterns.fieldStack}>
            <Label htmlFor="ticket-detail-ticket-number">
              {t("customers.ledger.corrections.fields.ticketNumber")}
            </Label>
            <Input
              id="ticket-detail-ticket-number"
              name="ticket_number"
              defaultValue={ticket.ticket_number ?? ""}
            />
          </div>
          <div className={patterns.fieldStack}>
            <Label htmlFor="ticket-detail-airline">
              {t("customers.ledger.corrections.fields.airline")}
            </Label>
            <select
              className={selectInputClassName}
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
          <div className={patterns.fieldStack}>
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

        <div className={patterns.fieldStack}>
          <Label htmlFor="ticket-detail-passengers">
            {t("customers.ledger.corrections.fields.passengers")}
          </Label>
          <Textarea
            id="ticket-detail-passengers"
            name="passengers"
            defaultValue={ticket.passengers.join("\n")}
          />
        </div>

        <div className={patterns.fourColumnGrid}>
          <div className={patterns.fieldStack}>
            <Label htmlFor="ticket-detail-departure-place">
              {t("customers.ledger.corrections.fields.departurePlace")}
            </Label>
            <Input
              id="ticket-detail-departure-place"
              name="departure_place"
              defaultValue={ticket.departure_place ?? ""}
            />
          </div>
          <div className={patterns.fieldStack}>
            <Label htmlFor="ticket-detail-arrival-place">
              {t("customers.ledger.corrections.fields.arrivalPlace")}
            </Label>
            <Input
              id="ticket-detail-arrival-place"
              name="arrival_place"
              defaultValue={ticket.arrival_place ?? ""}
            />
          </div>
          <div className={patterns.fieldStack}>
            <Label htmlFor="ticket-detail-departure-code">
              {t("customers.ledger.corrections.fields.departureCode")}
            </Label>
            <Input
              id="ticket-detail-departure-code"
              name="departure_code"
              defaultValue={ticket.departure_code ?? ""}
            />
          </div>
          <div className={patterns.fieldStack}>
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

        <div className={styles.priceGrid}>
          <div className={patterns.fieldStack}>
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
          <div className={patterns.fieldStack}>
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
          <div className={patterns.fieldStack}>
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
          <div className={patterns.fieldStack}>
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
          <div className={patterns.fieldStack}>
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
          <div className={patterns.fieldStack}>
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
          <div className={patterns.fieldStack}>
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
          <div className={patterns.fieldStack}>
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
          <p role="alert" className={patterns.errorText}>
            {state.message}
          </p>
        ) : null}

        <div className={patterns.endRow}>
          <LifecycleSubmitButton
            idleLabel={t("customers.ledger.corrections.save")}
            pendingLabel={t("customers.ledger.corrections.saving")}
          />
        </div>
      </form>
    </Panel>
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
    <div className={patterns.contentStack}>
      <Panel className={styles.panel}>
        <div className={styles.header}>
          <div>
            <p className={patterns.accentEyebrow}>
              {t("tickets.detail.eyebrow")}
            </p>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>
                {ticket.pnr ?? t("tickets.detail.emptyValue")}
              </h1>
              <StatusChip tone={getStatusTone(ticket.status)}>
                {t(`tickets.statuses.${ticket.status}`)}
              </StatusChip>
            </div>
            <p className={`${patterns.mutedText} ${styles.description}`}>
              {t("tickets.detail.description")}
            </p>
          </div>

          <Button
            as={Link}
            href={`/customers/${ticket.customer_id}`}
            variant="outline"
          >
            {t("tickets.detail.openCustomer")}
          </Button>
        </div>

        <div className={styles.metricGrid}>
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
      </Panel>

      <section className={styles.layout}>
        <Panel className={styles.panel}>
          <div>
            <p className={patterns.accentEyebrow}>
              {t("tickets.detail.ticketInfoEyebrow")}
            </p>
            <h2 className={styles.sectionTitle}>
              {t("tickets.detail.ticketInfoTitle")}
            </h2>
          </div>

          <div className={styles.detailGrid}>
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

          <div className={styles.passengers}>
            <p className={patterns.eyebrow}>
              {t("tickets.detail.fields.passengers")}
            </p>
            <div className={styles.passengerList}>
              {ticket.passengers.map((passenger) => (
                <StatusChip key={passenger}>
                  {passenger}
                </StatusChip>
              ))}
            </div>
          </div>
        </Panel>

        <aside className={patterns.contentStack}>
          <Panel className={styles.panel}>
            <p className={patterns.accentEyebrow}>
              {t("tickets.detail.actionsEyebrow")}
            </p>
            <h2 className={styles.sectionTitle}>
              {t("tickets.detail.actionsTitle")}
            </h2>
            <p className={patterns.mutedText}>
              {t("tickets.detail.actionsDescription")}
            </p>

            <div className={styles.actionStack}>
              <form action={voidAction} className={styles.actionForm}>
                <input name="ticket_id" type="hidden" value={ticket.id} />
                <input name="customer_id" type="hidden" value={ticket.customer_id} />
                <div className={styles.responsiveAction}>
                  <div>
                    <p className={patterns.sectionTitle}>
                      {t("tickets.actions.voidTitle")}
                    </p>
                    <p className={patterns.mutedText}>
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

              <form action={refundAction} className={styles.actionForm}>
                <input name="ticket_id" type="hidden" value={ticket.id} />
                <input name="customer_id" type="hidden" value={ticket.customer_id} />
                <div className={patterns.stack}>
                  <div>
                    <p className={patterns.sectionTitle}>
                      {t("tickets.actions.refundTitle")}
                    </p>
                    <p className={patterns.mutedText}>
                      {t("tickets.actions.refundDescription")}
                    </p>
                  </div>
                  <div className={styles.refundControls}>
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
                    <p className={patterns.errorText}>{refundState.fieldErrors.amount}</p>
                  ) : null}
                </div>
              </form>

              <form action={reassignAction} className={styles.actionForm}>
                <input name="ticket_id" type="hidden" value={ticket.id} />
                <input name="customer_id" type="hidden" value={ticket.customer_id} />
                <div className={patterns.stack}>
                  <div>
                    <p className={patterns.sectionTitle}>
                      {t("tickets.actions.reassignTitle")}
                    </p>
                    <p className={patterns.mutedText}>
                      {t("tickets.actions.reassignDescription")}
                    </p>
                  </div>
                  <div className={patterns.stack}>
                    <select
                      aria-label={t("tickets.actions.reassignCustomer")}
                      className={selectInputClassName}
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
                    <p className={patterns.errorText}>
                      {reassignState.fieldErrors.new_customer_id}
                    </p>
                  ) : null}
                </div>
              </form>
            </div>
          </Panel>
        </aside>
      </section>

      <Panel className={styles.panel}>
        <p className={patterns.accentEyebrow}>
          {t("tickets.detail.timestampsEyebrow")}
        </p>
        <div className={styles.timestampGrid}>
          <DetailItem
            label={t("tickets.detail.fields.createdAt")}
            value={formatDateTime(ticket.created_at)}
          />
          <DetailItem
            label={t("tickets.detail.fields.updatedAt")}
            value={formatDateTime(ticket.updated_at)}
          />
        </div>
      </Panel>

      {currentUserRole === "ADMIN" ? <TicketCorrectionForm ticket={ticket} /> : null}

      <div className={patterns.endRow}>
        <Button as={Link} href="/report" variant="outline">
          {t("tickets.detail.openReport")}
          <ArrowRight className={patterns.iconSmall} />
        </Button>
      </div>
    </div>
  )
}
