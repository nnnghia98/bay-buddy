import { z } from "zod"

import { paymentMethodOptions } from "@/schemas/finance"
import { AirlineSchema } from "@/schemas/enums"

const defaultManualDebtValidationMessages: ManualDebtValidationMessages = {
  customerNameRequired: "Customer is required.",
  pnrRequired: "PNR is required.",
  pnrLength: "PNR must be exactly 6 characters.",
  airlineRequired: "Airline is required.",
  ticketNumberRequired: "Ticket number is required.",
  passengerRequired: "At least one passenger is required.",
  flightDateRequired: "Flight date is required.",
  bookedAtRequired: "Ticket issue date is required.",
  routeRequired: "Departure and arrival codes are required.",
  netPriceMin: "Net price must be at least 0.",
  evPriceMin: "EV price must be at least 0.",
  astPriceMin: "AST net price must be at least 0.",
  thfPriceMin: "THF price must be at least 0.",
  webPriceMin: "WEB price must be at least 0.",
  insurancePriceMin: "Insurance price must be at least 0.",
  sellingPriceMin: "Selling price must be at least 0.",
  discountMin: "Discount must be at least 0.",
  paymentAmountMin: "Payment must be at least 0.",
  paymentMethodRequired: "Please choose a valid payment type.",
  sellingPriceFormula: "Selling price must be greater than or equal to net price.",
}

const defaultManualDebtRowUpdateValidationMessages: ManualDebtRowUpdateValidationMessages = {
  customerIdInvalid: "Customer is invalid.",
  ticketIdInvalid: "Ticket is invalid.",
  bookedAtInvalid: "Ticket issue date is invalid.",
  flightDateInvalid: "Flight date is invalid.",
  pnrLength: "PNR must be exactly 6 characters.",
  ticketNumberInvalid: "Ticket number is invalid.",
  airlineInvalid: "Airline is invalid.",
  passengerRequired: "At least one passenger is required.",
  itineraryInvalid: "Route is invalid.",
  netPriceMin: "Net price must be at least 0.",
  amountMin: "Amount must be at least 0.",
  paymentMethodInvalid: "Payment type is invalid.",
  paymentDateInvalid: "Payment date is invalid.",
  paymentNoteMax: "Note must not exceed 2000 characters.",
  paymentTransactionIdInvalid: "Linked payment is invalid.",
}

export type ManualDebtValidationMessages = {
  customerNameRequired: string
  pnrRequired: string
  pnrLength: string
  airlineRequired: string
  ticketNumberRequired: string
  passengerRequired: string
  flightDateRequired: string
  bookedAtRequired: string
  routeRequired: string
  netPriceMin: string
  evPriceMin: string
  astPriceMin: string
  thfPriceMin: string
  webPriceMin: string
  insurancePriceMin: string
  sellingPriceMin: string
  discountMin: string
  paymentAmountMin: string
  paymentMethodRequired: string
  sellingPriceFormula: string
}

export type ManualDebtRowUpdateValidationMessages = {
  customerIdInvalid: string
  ticketIdInvalid: string
  bookedAtInvalid: string
  flightDateInvalid: string
  pnrLength: string
  ticketNumberInvalid: string
  airlineInvalid: string
  passengerRequired: string
  itineraryInvalid: string
  netPriceMin: string
  amountMin: string
  paymentMethodInvalid: string
  paymentDateInvalid: string
  paymentNoteMax: string
  paymentTransactionIdInvalid: string
}

type ManualDebtValidationKey =
  | "manualDebts.validation.customerNameRequired"
  | "manualDebts.validation.pnrRequired"
  | "manualDebts.validation.pnrLength"
  | "manualDebts.validation.airlineRequired"
  | "manualDebts.validation.ticketNumberRequired"
  | "manualDebts.validation.passengerRequired"
  | "manualDebts.validation.flightDateRequired"
  | "manualDebts.validation.bookedAtRequired"
  | "manualDebts.validation.routeRequired"
  | "manualDebts.validation.netPriceMin"
  | "manualDebts.validation.evPriceMin"
  | "manualDebts.validation.astPriceMin"
  | "manualDebts.validation.thfPriceMin"
  | "manualDebts.validation.webPriceMin"
  | "manualDebts.validation.insurancePriceMin"
  | "manualDebts.validation.sellingPriceMin"
  | "manualDebts.validation.discountMin"
  | "manualDebts.validation.paymentAmountMin"
  | "manualDebts.validation.paymentMethodRequired"
  | "manualDebts.validation.sellingPriceFormula"

type ManualDebtRowUpdateValidationKey =
  | "manualDebts.validation.customerIdInvalid"
  | "manualDebts.validation.ticketIdInvalid"
  | "manualDebts.validation.bookedAtInvalid"
  | "manualDebts.validation.flightDateInvalid"
  | "manualDebts.validation.pnrLength"
  | "manualDebts.validation.ticketNumberInvalid"
  | "manualDebts.validation.airlineInvalid"
  | "manualDebts.validation.passengerRequired"
  | "manualDebts.validation.itineraryInvalid"
  | "manualDebts.validation.netPriceMin"
  | "manualDebts.validation.amountMin"
  | "manualDebts.validation.paymentMethodInvalid"
  | "manualDebts.validation.paymentDateInvalid"
  | "manualDebts.validation.paymentNoteMax"
  | "manualDebts.validation.paymentTransactionIdInvalid"

function normalizeRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function normalizeUppercaseOptionalString(value: unknown): string | undefined {
  return normalizeOptionalString(value)?.toUpperCase()
}

function normalizeNullableString(value: unknown): string | null {
  return normalizeOptionalString(value) ?? null
}

function normalizeUppercaseNullableString(value: unknown): string | null {
  return normalizeNullableString(value)?.toUpperCase() ?? null
}

function normalizeAmount(value: unknown): number {
  if (typeof value === "number") {
    return value
  }

  if (value == null) {
    return 0
  }

  if (typeof value !== "string") {
    return Number.NaN
  }

  if (value.trim().length === 0) {
    return 0
  }

  const digitsOnly = value.replace(/[^\d]/g, "")
  return Number(digitsOnly)
}

function normalizeNullableAmount(value: unknown): number | null {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return null
  }

  return normalizeAmount(value)
}

function normalizePaymentMethod(value: unknown): string | undefined {
  return normalizeOptionalString(value)
}

function normalizeOptionalDate(value: unknown): unknown {
  if (value instanceof Date) {
    return value
  }

  if (typeof value !== "string") {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function normalizePassengers(value: unknown): string[] {
  if (typeof value !== "string") {
    return []
  }

  return value
    .split(/\r?\n|,/)
    .map((passenger) => passenger.trim().toUpperCase())
    .filter(Boolean)
}

function normalizeRowPassengers(value: unknown): string[] {
  if (typeof value !== "string") {
    return []
  }

  return value
    .split(/\r?\n|,/)
    .map((passenger) => passenger.trim())
    .filter(Boolean)
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === "true"
}

function normalizeNullableDate(value: unknown): unknown {
  if (value instanceof Date) {
    return value
  }

  if (typeof value !== "string") {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function normalizeRequiredDate(value: unknown): unknown {
  const normalized = normalizeNullableDate(value)
  return normalized ?? Number.NaN
}

function normalizeSignedAmount(value: unknown): number {
  if (typeof value === "number") {
    return value
  }

  if (typeof value !== "string") {
    return Number.NaN
  }

  const normalizedValue = value.trim()
  const digitsOnly = normalizedValue.replace(/[^\d]/g, "")
  const parsedValue = digitsOnly ? Number(digitsOnly) : 0

  return normalizedValue.startsWith("-") ? -parsedValue : parsedValue
}

export function getManualDebtValidationMessages(
  t: (key: ManualDebtValidationKey) => string,
): ManualDebtValidationMessages {
  return {
    customerNameRequired: t("manualDebts.validation.customerNameRequired"),
    pnrRequired: t("manualDebts.validation.pnrRequired"),
    pnrLength: t("manualDebts.validation.pnrLength"),
    airlineRequired: t("manualDebts.validation.airlineRequired"),
    ticketNumberRequired: t("manualDebts.validation.ticketNumberRequired"),
    passengerRequired: t("manualDebts.validation.passengerRequired"),
    flightDateRequired: t("manualDebts.validation.flightDateRequired"),
    bookedAtRequired: t("manualDebts.validation.bookedAtRequired"),
    routeRequired: t("manualDebts.validation.routeRequired"),
    netPriceMin: t("manualDebts.validation.netPriceMin"),
    evPriceMin: t("manualDebts.validation.evPriceMin"),
    astPriceMin: t("manualDebts.validation.astPriceMin"),
    thfPriceMin: t("manualDebts.validation.thfPriceMin"),
    webPriceMin: t("manualDebts.validation.webPriceMin"),
    insurancePriceMin: t("manualDebts.validation.insurancePriceMin"),
    sellingPriceMin: t("manualDebts.validation.sellingPriceMin"),
    discountMin: t("manualDebts.validation.discountMin"),
    paymentAmountMin: t("manualDebts.validation.paymentAmountMin"),
    paymentMethodRequired: t("manualDebts.validation.paymentMethodRequired"),
    sellingPriceFormula: t("manualDebts.validation.sellingPriceFormula"),
  }
}

export function getManualDebtRowUpdateValidationMessages(
  t: (key: ManualDebtRowUpdateValidationKey) => string,
): ManualDebtRowUpdateValidationMessages {
  return {
    customerIdInvalid: t("manualDebts.validation.customerIdInvalid"),
    ticketIdInvalid: t("manualDebts.validation.ticketIdInvalid"),
    bookedAtInvalid: t("manualDebts.validation.bookedAtInvalid"),
    flightDateInvalid: t("manualDebts.validation.flightDateInvalid"),
    pnrLength: t("manualDebts.validation.pnrLength"),
    ticketNumberInvalid: t("manualDebts.validation.ticketNumberInvalid"),
    airlineInvalid: t("manualDebts.validation.airlineInvalid"),
    passengerRequired: t("manualDebts.validation.passengerRequired"),
    itineraryInvalid: t("manualDebts.validation.itineraryInvalid"),
    netPriceMin: t("manualDebts.validation.netPriceMin"),
    amountMin: t("manualDebts.validation.amountMin"),
    paymentMethodInvalid: t("manualDebts.validation.paymentMethodInvalid"),
    paymentDateInvalid: t("manualDebts.validation.paymentDateInvalid"),
    paymentNoteMax: t("manualDebts.validation.paymentNoteMax"),
    paymentTransactionIdInvalid: t(
      "manualDebts.validation.paymentTransactionIdInvalid",
    ),
  }
}

export function createManualDebtRowUpdateSchema(
  messages: ManualDebtRowUpdateValidationMessages,
) {
  const amount = z.preprocess(
    normalizeAmount,
    z.number().min(0, messages.amountMin),
  )

  return z
    .object({
      customer_id: z.string().uuid(messages.customerIdInvalid),
      ticket_id: z.string().uuid(messages.ticketIdInvalid),
      pnr: z.preprocess(
        normalizeUppercaseNullableString,
        z.string().length(6, messages.pnrLength).nullable(),
      ),
      airline: z.preprocess(
        normalizeUppercaseNullableString,
        z
          .enum(AirlineSchema.options, { message: messages.airlineInvalid })
          .nullable(),
      ),
      ticket_number: z.preprocess(
        normalizeNullableString,
        z.string().max(50, messages.ticketNumberInvalid).nullable(),
      ),
      passengers: z.preprocess(
        normalizeRowPassengers,
        z.array(z.string().min(1)).min(1, messages.passengerRequired),
      ),
      itinerary: z.preprocess(
        normalizeUppercaseNullableString,
        z.string().max(100, messages.itineraryInvalid).nullable(),
      ),
      flight_date: z.preprocess(
        normalizeRequiredDate,
        z.coerce.date({ error: messages.flightDateInvalid }),
      ),
      booked_at: z.preprocess(
        normalizeNullableDate,
        z.coerce.date({ error: messages.bookedAtInvalid }).nullable(),
      ),
      net_price: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.netPriceMin),
      ),
      selling_price: amount,
      discount: amount,
      ev_price: amount,
      ast_price: amount,
      thf_price: amount,
      web_price: amount,
      insurance_price: amount,
      true_income: z.preprocess(normalizeSignedAmount, z.number()),
      true_income_override: z.preprocess(normalizeBoolean, z.boolean()),
      payment_method: z.preprocess(
        normalizePaymentMethod,
        z
          .enum(paymentMethodOptions, {
            message: messages.paymentMethodInvalid,
          })
          .optional(),
      ),
      payment_amount: z.preprocess(
        normalizeNullableAmount,
        z.number().min(0, messages.amountMin).nullable(),
      ),
      payment_occurred_at: z.preprocess(
        normalizeNullableDate,
        z.coerce.date({ error: messages.paymentDateInvalid }).nullable(),
      ),
      payment_date_uses_charge: z.preprocess(normalizeBoolean, z.boolean()),
      payment_method_changed: z.preprocess(normalizeBoolean, z.boolean()),
      payment_note: z.preprocess(
        (value) => (typeof value === "string" ? value.trim() : ""),
        z.string().max(2000, messages.paymentNoteMax),
      ),
      payment_note_changed: z.preprocess(normalizeBoolean, z.boolean()),
      payment_amount_changed: z.preprocess(normalizeBoolean, z.boolean()),
      payment_occurred_at_changed: z.preprocess(normalizeBoolean, z.boolean()),
      payment_transaction_ids: z.array(
        z.string().uuid(messages.paymentTransactionIdInvalid),
      ),
    })
    .superRefine((values, context) => {
      if (
        values.payment_occurred_at_changed &&
        values.payment_occurred_at === null
      ) {
        context.addIssue({
          code: "custom",
          message: messages.paymentDateInvalid,
          path: ["payment_occurred_at"],
        })
      }
    })
}

export const manualDebtRowUpdateSchema = createManualDebtRowUpdateSchema(
  defaultManualDebtRowUpdateValidationMessages,
)

export type ManualDebtRowUpdateFormValues = z.infer<
  typeof manualDebtRowUpdateSchema
>

export type ManualDebtRowUpdateActionState = {
  status: "idle" | "success" | "error"
  message: string | null
  fieldErrors: Partial<Record<keyof ManualDebtRowUpdateFormValues, string>>
  submittedAt: number | null
}

export const initialManualDebtRowUpdateActionState: ManualDebtRowUpdateActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  submittedAt: null,
}

export function createManualDebtFormSchema(
  messages: ManualDebtValidationMessages,
) {
  const requiredString = (message: string, maxLength?: number) =>
    z.preprocess(
      normalizeRequiredString,
      maxLength
        ? z.string().min(1, message).max(maxLength)
        : z.string().min(1, message),
    )

  return z
    .object({
      customer_name: requiredString(messages.customerNameRequired, 255),
      pnr: z.preprocess(
        normalizeUppercaseOptionalString,
        z.string().length(6, messages.pnrLength).optional(),
      ),
      airline: z.preprocess(
        normalizeUppercaseOptionalString,
        z.enum(["VNA", "VJ", "QH", "VU"]).optional(),
      ),
      ticket_number: z.preprocess(
        normalizeOptionalString,
        z.string().max(50).optional(),
      ),
      passengers: z.preprocess(
        normalizePassengers,
        z.array(z.string().min(1)),
      ),
      itinerary: z.preprocess(
        normalizeOptionalString,
        z.string().max(100).optional(),
      ),
      departure_code: z.preprocess(
        normalizeUppercaseOptionalString,
        z.string().max(10).optional(),
      ),
      arrival_code: z.preprocess(
        normalizeUppercaseOptionalString,
        z.string().max(10).optional(),
      ),
      flight_date: z.preprocess(normalizeOptionalDate, z.coerce.date().optional()),
      booked_at: z.preprocess(normalizeOptionalDate, z.coerce.date().optional()),
      net_price: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.netPriceMin),
      ),
      ev_price: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.evPriceMin),
      ),
      ast_price: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.astPriceMin),
      ),
      thf_price: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.thfPriceMin),
      ),
      web_price: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.webPriceMin),
      ),
      insurance_price: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.insurancePriceMin),
      ),
      selling_price: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.sellingPriceMin),
      ),
      discount: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.discountMin),
      ),
      payment_amount: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.paymentAmountMin),
      ),
      payment_method: z.preprocess(
        normalizePaymentMethod,
        z
          .enum(paymentMethodOptions, {
            message: messages.paymentMethodRequired,
          })
          .optional(),
      ),
      payment_date: z.preprocess(
        normalizeOptionalDate,
        z.coerce.date().optional(),
      ),
    })
    .superRefine((values, context) => {
      const hasPaymentDetails =
        values.payment_amount > 0 ||
        values.payment_method !== undefined ||
        values.payment_date !== undefined

      if (!hasPaymentDetails) {
        return
      }

      if (
        (values.payment_amount > 0 || values.payment_date !== undefined) &&
        values.payment_method === undefined
      ) {
        context.addIssue({
          code: "custom",
          message: messages.paymentMethodRequired,
          path: ["payment_method"],
        })
      }
    })
}

export const manualDebtFormSchema = createManualDebtFormSchema(
  defaultManualDebtValidationMessages,
)

export type ManualDebtFormValues = z.infer<typeof manualDebtFormSchema>

export type ManualDebtActionState = {
  status: "idle" | "success" | "error"
  message: string | null
  fieldErrors: Partial<Record<keyof ManualDebtFormValues, string>>
  submittedAt: number | null
  ticketId: string | null
}

export const initialManualDebtActionState: ManualDebtActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  submittedAt: null,
  ticketId: null,
}
