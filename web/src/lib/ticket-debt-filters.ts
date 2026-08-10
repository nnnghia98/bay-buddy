import {
  paymentMethodOptions,
  type PaymentMethod,
} from "@/schemas/finance"

export const ticketDebtMoneyFilterValues = ["zero", "positive"] as const

export type TicketDebtMoneyFilter =
  (typeof ticketDebtMoneyFilterValues)[number]

export const ticketDebtPaymentMethodFilterValues = [
  "none",
  ...paymentMethodOptions,
] as const

export type TicketDebtPaymentMethodFilter = "none" | PaymentMethod

export const ticketDebtFilterColumns = [
  "booked_at",
  "payment_method",
  "ev_price",
  "ast_price",
  "thf_price",
  "web_price",
  "insurance_price",
  "selling_price",
] as const

export type TicketDebtFilterColumn =
  (typeof ticketDebtFilterColumns)[number]

export const ticketDebtMoneyFilterColumns = [
  "ev_price",
  "ast_price",
  "thf_price",
  "web_price",
  "insurance_price",
  "selling_price",
] as const satisfies readonly TicketDebtFilterColumn[]

export type TicketDebtMoneyFilterColumn =
  (typeof ticketDebtMoneyFilterColumns)[number]

export type TicketDebtFilters = {
  ast_price?: TicketDebtMoneyFilter
  booked_at?: string
  ev_price?: TicketDebtMoneyFilter
  insurance_price?: TicketDebtMoneyFilter
  payment_method?: TicketDebtPaymentMethodFilter
  selling_price?: TicketDebtMoneyFilter
  thf_price?: TicketDebtMoneyFilter
  web_price?: TicketDebtMoneyFilter
}

export function isTicketDebtMoneyFilter(
  value: string | null | undefined,
): value is TicketDebtMoneyFilter {
  return ticketDebtMoneyFilterValues.includes(value as TicketDebtMoneyFilter)
}

export function isTicketDebtPaymentMethodFilter(
  value: string | null | undefined,
): value is TicketDebtPaymentMethodFilter {
  return ticketDebtPaymentMethodFilterValues.includes(
    value as TicketDebtPaymentMethodFilter,
  )
}

export function isTicketDebtMoneyFilterColumn(
  column: TicketDebtFilterColumn,
): column is TicketDebtMoneyFilterColumn {
  return ticketDebtMoneyFilterColumns.includes(
    column as TicketDebtMoneyFilterColumn,
  )
}

export function appendTicketDebtFilters(
  params: URLSearchParams,
  filters: TicketDebtFilters | undefined,
): void {
  if (!filters) {
    return
  }

  ticketDebtFilterColumns.forEach((column) => {
    const value = filters[column]
    if (value) {
      params.set(column, value)
    }
  })
}

export function getTicketDebtFiltersFromSearchParams(
  params: Pick<URLSearchParams, "get">,
): TicketDebtFilters {
  const bookedAt = params.get("booked_at")
  const paymentMethod = params.get("payment_method")
  const evPrice = params.get("ev_price")
  const astPrice = params.get("ast_price")
  const thfPrice = params.get("thf_price")
  const webPrice = params.get("web_price")
  const insurancePrice = params.get("insurance_price")
  const sellingPrice = params.get("selling_price")

  return {
    ...(bookedAt && /^\d{4}-\d{2}-\d{2}$/.test(bookedAt)
      ? { booked_at: bookedAt }
      : {}),
    ...(isTicketDebtPaymentMethodFilter(paymentMethod)
      ? { payment_method: paymentMethod }
      : {}),
    ...(isTicketDebtMoneyFilter(evPrice) ? { ev_price: evPrice } : {}),
    ...(isTicketDebtMoneyFilter(astPrice) ? { ast_price: astPrice } : {}),
    ...(isTicketDebtMoneyFilter(thfPrice) ? { thf_price: thfPrice } : {}),
    ...(isTicketDebtMoneyFilter(webPrice) ? { web_price: webPrice } : {}),
    ...(isTicketDebtMoneyFilter(insurancePrice)
      ? { insurance_price: insurancePrice }
      : {}),
    ...(isTicketDebtMoneyFilter(sellingPrice)
      ? { selling_price: sellingPrice }
      : {}),
  }
}

export function getTicketDebtFilterCount(filters: TicketDebtFilters): number {
  return ticketDebtFilterColumns.filter((column) => filters[column] != null)
    .length
}

export function getTicketDebtFiltersKey(filters: TicketDebtFilters): string {
  const params = new URLSearchParams()
  appendTicketDebtFilters(params, filters)
  return params.toString()
}
