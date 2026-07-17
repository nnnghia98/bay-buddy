import { describe, expect, it } from "vitest"

import {
  workbookCellValueLookupRequestSchema,
  workbookColumnFormulaSchema,
  workbookFormulaPreviewResponseSchema,
  workbookPriceDraftSchema,
  workbookSaveRequestSchema,
  workbookSessionListSchema,
} from "@/schemas/workbook"

const requestId = "5c7804b9-2ff3-4c40-bfe9-d778bd3cd013"

describe("workbook session library validation", () => {
  it("parses paginated session summaries", () => {
    const result = workbookSessionListSchema.parse({
      items: [
        {
          id: "b128452e-c49f-4be8-9794-bb399c1fd050",
          display_name: "July prices",
          original_filename: "prices.xlsx",
          selected_sheet_name: "Tickets",
          current_version: 2,
          status: "DRAFT",
          created_at: "2026-07-12T00:00:00Z",
          updated_at: "2026-07-14T00:00:00Z",
        },
      ],
      pagination: { page: 1, page_size: 10, total: 1, total_pages: 1 },
    })

    expect(result.items[0].display_name).toBe("July prices")
    expect(result.pagination.total).toBe(1)
  })

  it("rejects summaries without a display fallback", () => {
    expect(() =>
      workbookSessionListSchema.parse({
        items: [
          {
            id: "b128452e-c49f-4be8-9794-bb399c1fd050",
            display_name: "",
            original_filename: "prices.xlsx",
            selected_sheet_name: "Tickets",
            current_version: 1,
            status: "DRAFT",
            created_at: "2026-07-12T00:00:00Z",
            updated_at: "2026-07-12T00:00:00Z",
          },
        ],
        pagination: { page: 1, page_size: 10, total: 1, total_pages: 1 },
      }),
    ).toThrow()
  })
})

describe("workbook cell lookup validation", () => {
  it("accepts unique row and column pairs and rejects duplicates", () => {
    expect(workbookCellValueLookupRequestSchema.parse({
      base_version: 2,
      cells: [
        { row_number: 2, column_id: "source-a" },
        { row_number: 2, column_id: "source-b" },
      ],
    }).cells).toHaveLength(2)
    expect(() => workbookCellValueLookupRequestSchema.parse({
      base_version: 2,
      cells: [
        { row_number: 2, column_id: "source-a" },
        { row_number: 2, column_id: "source-a" },
      ],
    })).toThrow()
  })
})

describe("workbook formula validation", () => {
  it("accepts nested guided IF, comparison, and arithmetic nodes", () => {
    const result = workbookColumnFormulaSchema.parse({
      schema_version: 1,
      expression: {
        type: "if",
        condition: {
          type: "comparison",
          operator: ">",
          left: { type: "column", column_id: "sale" },
          right: { type: "column", column_id: "fare" },
        },
        when_true: {
          type: "binary",
          operator: "-",
          left: { type: "column", column_id: "sale" },
          right: { type: "column", column_id: "fare" },
        },
        when_false: { type: "constant", value: "0" },
      },
    })
    expect(result.expression.type).toBe("if")
  })

  it("rejects raw formula text and over-arity functions", () => {
    expect(workbookColumnFormulaSchema.safeParse({ schema_version: 1, expression: "=A1+B1" }).success).toBe(false)
    expect(workbookColumnFormulaSchema.safeParse({
      schema_version: 1,
      expression: {
        type: "function",
        function: "SUM",
        arguments: Array.from({ length: 21 }, () => ({ type: "constant", value: "1" })),
      },
    }).success).toBe(false)
  })

  it("parses row-level preview errors", () => {
    const result = workbookFormulaPreviewResponseSchema.parse({
      valid: false,
      normalized_formula: null,
      readable_expression: null,
      referenced_column_ids: [],
      results: [{ row_number: 2, value: null, error_code: "FORMULA_DIVISION_BY_ZERO", error_message: "Cannot divide by zero." }],
      errors: [],
      warnings: [{ code: "PREVIEW_ROW_ERRORS", message: "Review rows.", details: {} }],
    })
    expect(result.results[0].error_code).toBe("FORMULA_DIVISION_BY_ZERO")
  })
})

describe("workbook save validation", () => {
  it("accepts generic scalar, blank, and boolean cell changes", () => {
    const result = workbookSaveRequestSchema.parse({
      request_id: requestId,
      base_version: 2,
      changes: [{
        row_number: 5,
        values: {
          "source-text": "updated",
          "source-number": -12.5,
          "source-date": "2026-07-14",
          "source-boolean": true,
          "source-blank": null,
        },
      }],
    })

    expect(result.changes[0].values["source-number"]).toBe(-12.5)
    expect(result.changes[0].values["source-blank"]).toBeNull()
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects non-finite numeric value %s",
    (value) => {
      expect(() =>
        workbookSaveRequestSchema.parse({
          request_id: requestId,
          base_version: 1,
          changes: [{ row_number: 2, values: { "source-number": value } }],
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
            message: "A save may change at most 500 cells.",
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
