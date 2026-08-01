import { describe, expect, it } from "vitest"

import { manualDebtFormSchema } from "@/schemas/manual-debt"

const validManualDebtInput = {
  customer_name: "Nguyen Van A",
  pnr: "abc123",
  airline: "VNA",
  ticket_number: "7381234567890",
  passengers: "NGUYEN VAN A",
  itinerary: "HAN-SGN",
  departure_code: "han",
  arrival_code: "sgn",
  flight_date: "2026-06-17T09:56:00.000Z",
  booked_at: "2026-06-17T09:56:00.000Z",
  net_price: "1000000",
  ev_price: "0",
  ast_price: "0",
  thf_price: "0",
  web_price: "0",
  insurance_price: "0",
  selling_price: "1200000",
  discount: "0",
  payment_amount: "",
  payment_method: "",
  payment_date: "",
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

  it("allows customer-only manual debt entry", () => {
    const parsed = manualDebtFormSchema.parse({
      ...validManualDebtInput,
      pnr: "",
      airline: "",
      ticket_number: "",
      passengers: "",
      itinerary: "",
      departure_code: "",
      arrival_code: "",
      flight_date: "",
      booked_at: "",
      net_price: "",
      ev_price: "",
      ast_price: "",
      thf_price: "",
      web_price: "",
      insurance_price: "",
      selling_price: "",
      discount: "",
    })

    expect(parsed.customer_name).toBe("Nguyen Van A")
    expect(parsed.ticket_number).toBeUndefined()
    expect(parsed.passengers).toEqual([])
    expect(parsed.itinerary).toBeUndefined()
    expect(parsed.departure_code).toBeUndefined()
    expect(parsed.arrival_code).toBeUndefined()
    expect(parsed.flight_date).toBeUndefined()
    expect(parsed.booked_at).toBeUndefined()
    expect(parsed.selling_price).toBe(0)
    expect(parsed.payment_amount).toBe(0)
    expect(parsed.payment_method).toBeUndefined()
    expect(parsed.payment_date).toBeUndefined()
  })

  it.each(["Chuyển khoản", "Tiền mặt", "AST", "THF"] as const)(
    "accepts %s for an optional payment",
    (paymentMethod) => {
      const parsed = manualDebtFormSchema.parse({
        ...validManualDebtInput,
        payment_amount: "500000",
        payment_method: paymentMethod,
      })

      expect(parsed.payment_amount).toBe(500000)
      expect(parsed.payment_method).toBe(paymentMethod)
    },
  )

  it("keeps the optional payment type empty by default", () => {
    const parsed = manualDebtFormSchema.parse({
      ...validManualDebtInput,
      payment_amount: "",
      payment_method: "",
    })

    expect(parsed.payment_amount).toBe(0)
    expect(parsed.payment_method).toBeUndefined()
  })

  it("requires a payment type when an amount is entered", () => {
    const result = manualDebtFormSchema.safeParse({
      ...validManualDebtInput,
      payment_amount: "500000",
      payment_method: "",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.payment_method).toBeDefined()
    }
  })

  it("allows a selected payment type without an amount", () => {
    const parsed = manualDebtFormSchema.parse({
      ...validManualDebtInput,
      payment_amount: "",
      payment_method: "AST",
    })

    expect(parsed.payment_amount).toBe(0)
    expect(parsed.payment_method).toBe("AST")
  })

  it("requires a payment type when a payment date is entered", () => {
    const result = manualDebtFormSchema.safeParse({
      ...validManualDebtInput,
      payment_amount: "",
      payment_method: "",
      payment_date: "2026-07-28",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.payment_method).toBeDefined()
    }
  })

  it("accepts an optional payment date with a complete payment", () => {
    const parsed = manualDebtFormSchema.parse({
      ...validManualDebtInput,
      payment_amount: "500000",
      payment_method: "THF",
      payment_date: "2026-07-28",
    })

    expect(parsed.payment_date?.toISOString()).toBe(
      "2026-07-28T00:00:00.000Z",
    )
  })

  it("rejects unsupported payment types", () => {
    const result = manualDebtFormSchema.safeParse({
      ...validManualDebtInput,
      payment_amount: "500000",
      payment_method: "Momo",
    })

    expect(result.success).toBe(false)
  })
})
