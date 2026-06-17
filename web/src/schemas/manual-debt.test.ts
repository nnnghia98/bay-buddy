import { describe, expect, it } from "vitest"

import { manualDebtFormSchema } from "@/schemas/manual-debt"

const validManualDebtInput = {
  customer_name: "Nguyen Van A",
  pnr: "abc123",
  airline: "VNA",
  ticket_number: "7381234567890",
  passengers: "NGUYEN VAN A",
  departure_code: "han",
  arrival_code: "sgn",
  flight_date: "2026-06-17T09:56:00.000Z",
  booked_at: "2026-06-17T09:56:00.000Z",
  net_price: "1000000",
  ev_price: "0",
  ast_price: "0",
  thf_price: "0",
  web_price: "0",
  selling_price: "1200000",
  discount: "0",
}

describe("manualDebtFormSchema", () => {
  it("allows blank PNR for manual debt entry", () => {
    const parsed = manualDebtFormSchema.parse({
      ...validManualDebtInput,
      pnr: "",
    })

    expect(parsed.pnr).toBeUndefined()
  })

  it("keeps validating partial PNR values", () => {
    const result = manualDebtFormSchema.safeParse({
      ...validManualDebtInput,
      pnr: "ABC",
    })

    expect(result.success).toBe(false)
  })

  it("normalizes provided PNR values to uppercase", () => {
    const parsed = manualDebtFormSchema.parse(validManualDebtInput)

    expect(parsed.pnr).toBe("ABC123")
  })

  it("allows blank airline for manual debt entry", () => {
    const parsed = manualDebtFormSchema.parse({
      ...validManualDebtInput,
      airline: "",
    })

    expect(parsed.airline).toBeUndefined()
  })

  it("requires route codes because itinerary is generated from them", () => {
    const result = manualDebtFormSchema.safeParse({
      ...validManualDebtInput,
      departure_code: "",
    })

    expect(result.success).toBe(false)
  })
})
