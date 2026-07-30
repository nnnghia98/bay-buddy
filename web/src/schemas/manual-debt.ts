import { z } from "zod"

import { paymentMethodOptions } from "@/schemas/finance"

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
  paymentAmountRequired: "Enter a payment amount after choosing a payment type.",
  paymentMethodRequired: "Please choose a valid payment type.",
  sellingPriceFormula: "Selling price must be greater than or equal to net price.",
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
  paymentAmountRequired: string
  paymentMethodRequired: string
  sellingPriceFormula: string
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
  | "manualDebts.validation.paymentAmountRequired"
  | "manualDebts.validation.paymentMethodRequired"
  | "manualDebts.validation.sellingPriceFormula"

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
    paymentAmountRequired: t("manualDebts.validation.paymentAmountRequired"),
    paymentMethodRequired: t("manualDebts.validation.paymentMethodRequired"),
    sellingPriceFormula: t("manualDebts.validation.sellingPriceFormula"),
  }
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

      if (values.payment_amount <= 0) {
        context.addIssue({
          code: "custom",
          message: messages.paymentAmountRequired,
          path: ["payment_amount"],
        })
      }

      if (values.payment_method === undefined) {
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
