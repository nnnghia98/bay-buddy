import { describe, expect, it } from "vitest"

import {
  workbookPriceDraftSchema,
  workbookSaveRequestSchema,
} from "@/schemas/workbook"

const requestId = "5c7804b9-2ff3-4c40-bfe9-d778bd3cd013"

describe("workbook save validation", () => {
  it("accepts finite whole non-negative VND changes", () => {
    const result = workbookSaveRequestSchema.parse({
      request_id: requestId,
      base_version: 2,
      changes: [{ row_number: 5, values: { selling_price: 1_250_000 } }],
    })

    expect(result.changes[0].values.selling_price).toBe(1_250_000)
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid money value %s",
    (value) => {
      expect(() =>
        workbookSaveRequestSchema.parse({
          request_id: requestId,
          base_version: 1,
          changes: [{ row_number: 2, values: { net_price: value } }],
        }),
      ).toThrow()
    },
  )

  it("rejects duplicate physical rows", () => {
    const result = workbookSaveRequestSchema.safeParse({
      request_id: requestId,
      base_version: 1,
      changes: [
        { row_number: 2, values: { net_price: 10 } },
        { row_number: 2, values: { selling_price: 20 } },
      ],
    })

    expect(result.success).toBe(false)
  })

  it("rejects more than 500 changed cells even within 500 rows", () => {
    const result = workbookSaveRequestSchema.safeParse({
      request_id: requestId,
      base_version: 1,
      changes: Array.from({ length: 251 }, (_, index) => ({
        row_number: index + 2,
        values: { net_price: 10, selling_price: 20 },
      })),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "A save may change at most 500 price cells.",
          }),
        ]),
      )
    }
  })

  it("validates local price drafts", () => {
    expect(
      workbookPriceDraftSchema.safeParse({ row_number: 3, net_price: 0 }).success,
    ).toBe(true)
    expect(
      workbookPriceDraftSchema.safeParse({ row_number: 0, net_price: 10 }).success,
    ).toBe(false)
  })
})
