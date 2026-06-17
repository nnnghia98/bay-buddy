import { describe, expect, it } from "vitest"

import { TicketReadSchema } from "@/schemas/ticket"

describe("TicketReadSchema", () => {
  it("accepts nullable optional route fields from the API", () => {
    const parsed = TicketReadSchema.parse({
      id: "44444444-4444-4444-8444-444444444444",
      pnr: "ABC123",
      airline: "VNA",
      ticket_number: null,
      departure_place: null,
      arrival_place: null,
      departure_code: null,
      arrival_code: null,
      passengers: ["NGUYEN VAN A"],
      itinerary: "HAN-SGN",
      flight_date: "2026-04-24T02:00:00.000Z",
      booked_at: "2026-04-23T08:30:00.000Z",
      created_at: "2026-04-24T04:00:00.000Z",
      updated_at: "2026-04-24T04:00:00.000Z",
      net_price: 1_000_000,
      selling_price: 1_250_000,
      discount: 50_000,
      true_income: 300_000,
      service_fee: 250_000,
      status: "CONFIRMED",
      customer_id: "11111111-1111-4111-8111-111111111111",
    })

    expect(parsed.ticket_number).toBeNull()
    expect(parsed.departure_place).toBeNull()
    expect(parsed.arrival_place).toBeNull()
    expect(parsed.departure_code).toBeNull()
    expect(parsed.arrival_code).toBeNull()
    expect(parsed.booked_at).toEqual(new Date("2026-04-23T08:30:00.000Z"))
  })

  it("accepts a nullable airline from manual ticket entries", () => {
    const parsed = TicketReadSchema.parse({
      id: "44444444-4444-4444-8444-444444444444",
      pnr: "MANUAL",
      airline: null,
      ticket_number: "7381234567890",
      departure_place: null,
      arrival_place: null,
      departure_code: null,
      arrival_code: null,
      passengers: ["NGUYEN VAN A"],
      itinerary: "HAN-SGN",
      flight_date: "2026-04-24T02:00:00.000Z",
      booked_at: "2026-04-23T08:30:00.000Z",
      created_at: "2026-04-24T04:00:00.000Z",
      updated_at: "2026-04-24T04:00:00.000Z",
      net_price: 1_000_000,
      selling_price: 1_250_000,
      discount: 50_000,
      true_income: 300_000,
      service_fee: 250_000,
      status: "CONFIRMED",
      customer_id: "11111111-1111-4111-8111-111111111111",
    })

    expect(parsed.airline).toBeNull()
  })

  it("accepts a nullable itinerary from customer-only manual entries", () => {
    const parsed = TicketReadSchema.parse({
      id: "44444444-4444-4444-8444-444444444444",
      pnr: "MANUAL",
      airline: null,
      ticket_number: null,
      departure_place: null,
      arrival_place: null,
      departure_code: null,
      arrival_code: null,
      passengers: [],
      itinerary: null,
      flight_date: "2026-04-24T02:00:00.000Z",
      booked_at: null,
      created_at: "2026-04-24T04:00:00.000Z",
      updated_at: "2026-04-24T04:00:00.000Z",
      net_price: 0,
      selling_price: 0,
      discount: 0,
      true_income: 0,
      service_fee: 0,
      status: "CONFIRMED",
      customer_id: "11111111-1111-4111-8111-111111111111",
    })

    expect(parsed.itinerary).toBeNull()
    expect(parsed.passengers).toEqual([])
  })
})
