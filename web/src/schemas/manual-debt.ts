import { z } from "zod"

const defaultManualDebtValidationMessages: ManualDebtValidationMessages = {
  customerNameRequired: "Customer is required.",
  pnrRequired: "PNR is required.",
  pnrLength: "PNR must be exactly 6 characters.",
  airlineRequired: "Airline is required.",
  ticketNumberRequired: "Ticket number is required.",
  passengerRequired: "At least one passenger is required.",
  flightDateRequired: "Flight date is required.",
  routeRequired: "Route is required.",
  netPriceMin: "Net price must be at least 0.",
  evPriceMin: "EV net price must be at least 0.",
  astPriceMin: "AST net price must be at least 0.",
  thfPriceMin: "THF price must be at least 0.",
  sellingPriceMin: "Selling price must be at least 0.",
  discountMin: "Discount must be at least 0.",
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
  routeRequired: string
  netPriceMin: string
  evPriceMin: string
  astPriceMin: string
  thfPriceMin: string
  sellingPriceMin: string
  discountMin: string
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
  | "manualDebts.validation.routeRequired"
  | "manualDebts.validation.netPriceMin"
  | "manualDebts.validation.evPriceMin"
  | "manualDebts.validation.astPriceMin"
  | "manualDebts.validation.thfPriceMin"
  | "manualDebts.validation.sellingPriceMin"
  | "manualDebts.validation.discountMin"
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

  if (typeof value !== "string") {
    return Number.NaN
  }

  const digitsOnly = value.replace(/[^\d]/g, "")
  return Number(digitsOnly)
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
    routeRequired: t("manualDebts.validation.routeRequired"),
    netPriceMin: t("manualDebts.validation.netPriceMin"),
    evPriceMin: t("manualDebts.validation.evPriceMin"),
    astPriceMin: t("manualDebts.validation.astPriceMin"),
    thfPriceMin: t("manualDebts.validation.thfPriceMin"),
    sellingPriceMin: t("manualDebts.validation.sellingPriceMin"),
    discountMin: t("manualDebts.validation.discountMin"),
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
        (value) => normalizeRequiredString(value).toUpperCase(),
        z
          .string()
          .min(1, messages.pnrRequired)
          .length(6, messages.pnrLength),
      ),
      airline: z.enum(["VNA", "VJ", "QH", "VU"], {
        message: messages.airlineRequired,
      }),
      ticket_number: requiredString(messages.ticketNumberRequired, 50),
      passengers: z
        .preprocess(normalizePassengers, z.array(z.string().min(1)))
        .refine((value) => value.length > 0, messages.passengerRequired),
      departure_place: z.preprocess(normalizeOptionalString, z.string().max(255).optional()),
      arrival_place: z.preprocess(normalizeOptionalString, z.string().max(255).optional()),
      departure_code: z.preprocess(
        normalizeUppercaseOptionalString,
        z.string().max(10).optional(),
      ),
      arrival_code: z.preprocess(
        normalizeUppercaseOptionalString,
        z.string().max(10).optional(),
      ),
      route: z.preprocess(
        (value) => normalizeUppercaseOptionalString(value),
        z.string().max(100).optional(),
      ),
      flight_date: z.coerce.date({
        message: messages.flightDateRequired,
      }),
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
      selling_price: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.sellingPriceMin),
      ),
      discount: z.preprocess(
        normalizeAmount,
        z.number().min(0, messages.discountMin),
      ),
    })
    .refine(
      (data) =>
        Boolean(data.route) ||
        Boolean(data.departure_code && data.arrival_code),
      {
        message: messages.routeRequired,
        path: ["route"],
      },
    )
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
