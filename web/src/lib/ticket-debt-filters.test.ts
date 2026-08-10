import { describe, expect, it } from "vitest"

import {
  appendTicketDebtFilters,
  getTicketDebtFilterCount,
  getTicketDebtFiltersFromSearchParams,
  getTicketDebtFiltersKey,
  type TicketDebtFilters,
} from "@/lib/ticket-debt-filters"

describe("ticket debt filters", () => {
  it("serializes multiple typed filters in a stable order", () => {
    const filters: TicketDebtFilters = {
      booked_at: "2026-08-05",
      payment_method: "none",
      ev_price: "zero",
      ast_price: "positive",
      selling_price: "positive",
    }
    const params = new URLSearchParams()

    appendTicketDebtFilters(params, filters)

    expect(params.toString()).toBe(
      "booked_at=2026-08-05&payment_method=none&ev_price=zero&ast_price=positive&selling_price=positive",
    )
    expect(getTicketDebtFilterCount(filters)).toBe(5)
    expect(getTicketDebtFiltersKey(filters)).toBe(params.toString())
  })

  it("reads supported filters and ignores invalid values", () => {
    const params = new URLSearchParams({
      booked_at: "2026-08-05",
      payment_method: "Tiền mặt",
      ev_price: "positive",
      ast_price: "negative",
      thf_price: "zero",
    })

    expect(getTicketDebtFiltersFromSearchParams(params)).toEqual({
      booked_at: "2026-08-05",
      payment_method: "Tiền mặt",
      ev_price: "positive",
      thf_price: "zero",
    })
  })
})
