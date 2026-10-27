import { describe, expect, it } from "vitest"
import { fieldPreferenceSchema } from "@/schemas/field-preferences"
import { satisfiesPersonalRules } from "./personal-field-validation"
import { ticketFieldKey } from "./field-mapping"

describe("personal field rules", () => {
  it("validates required text and length without rejecting optional blanks", () => {
    const rule = fieldPreferenceSchema.parse({ required: true, min_length: 3, max_length: 5 })
    expect(satisfiesPersonalRules("", rule)).toBe(false)
    expect(satisfiesPersonalRules("ab", rule)).toBe(false)
    expect(satisfiesPersonalRules("abcd", rule)).toBe(true)
    expect(satisfiesPersonalRules("abcdef", rule)).toBe(false)
    expect(satisfiesPersonalRules("", { ...rule, required: false })).toBe(true)
  })
  it("checks numeric limits for raw numbers and Vietnamese currency", () => {
    const rule = fieldPreferenceSchema.parse({ minimum: 1000, maximum: 2000 })
    expect(satisfiesPersonalRules("1.500", rule, true)).toBe(true)
    expect(satisfiesPersonalRules("999", rule, true)).toBe(false)
    expect(satisfiesPersonalRules("2001", rule)).toBe(false)
    expect(satisfiesPersonalRules("invalid", rule)).toBe(false)
  })
  it("ignores personal validation for hidden fields", () => {
    expect(satisfiesPersonalRules("", fieldPreferenceSchema.parse({ visible: false, min_length: 3 }))).toBe(true)
  })
  it("rejects contradictory settings", () => {
    expect(fieldPreferenceSchema.safeParse({ required: true, visible: false }).success).toBe(false)
    expect(fieldPreferenceSchema.safeParse({ min_length: 6, max_length: 3 }).success).toBe(false)
    expect(fieldPreferenceSchema.safeParse({ minimum: 4, maximum: 1 }).success).toBe(false)
  })
  it("maps table aliases without changing the ticket number field", () => {
    expect(ticketFieldKey("ticket_number")).toBe("ticket.ticket_number")
    expect(ticketFieldKey("evPrice")).toBe("ticket.ev_price")
    expect(ticketFieldKey("ticket_ev_price")).toBe("ticket.ev_price")
    expect(ticketFieldKey("paymentMethod")).toBe("transaction.method")
  })
})
