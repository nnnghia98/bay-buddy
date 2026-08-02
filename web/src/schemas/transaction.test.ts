import { describe, expect, it } from "vitest"

import {
  TransactionReadSchema,
  TransactionUpdateSchema,
} from "@/schemas/transaction"

describe("transaction note schemas", () => {
  it("accepts zero for an optional debt transaction", () => {
    expect(
      TransactionReadSchema.shape.amount.safeParse(0).success,
    ).toBe(true)
    expect(
      TransactionUpdateSchema.shape.amount.safeParse(0).success,
    ).toBe(true)
  })

  it("accepts a cleared note from the API", () => {
    expect(TransactionReadSchema.shape.note.safeParse(null).success).toBe(true)
    expect(TransactionUpdateSchema.shape.note.safeParse(null).success).toBe(true)
  })

  it("accepts an unpaid ticket transaction without a method", () => {
    expect(TransactionReadSchema.shape.method.safeParse(null).success).toBe(true)
  })
})
