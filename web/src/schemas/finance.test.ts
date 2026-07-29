import { describe, expect, it } from "vitest"

import {
  paymentMethodOptions,
  recordPaymentFormSchema,
} from "@/schemas/finance"

const validPaymentInput = {
  customer_id: "550e8400-e29b-41d4-a716-446655440000",
  amount: "500000",
  note: "Customer payment",
  evidence_url: "",
  linked_ticket_id: "",
}

describe("recordPaymentFormSchema", () => {
  it.each(paymentMethodOptions)("accepts %s as a payment type", (method) => {
    const parsed = recordPaymentFormSchema.parse({
      ...validPaymentInput,
      method,
    })

    expect(parsed.method).toBe(method)
  })
})
