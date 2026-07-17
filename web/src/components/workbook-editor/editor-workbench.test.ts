import { describe, expect, it } from "vitest"

import { parseWorkbookCellDraft, validateWorkbookDrafts } from "./editor-workbench"
import { parseVndDraft } from "./editable-price-cell"
import { formatWorkbookValue } from "./workbook-records-table"

describe("workbook editor cell drafts", () => {
  it("parses Vietnamese-friendly whole-VND input", () => {
    expect(parseVndDraft("1.250.000")).toBe(1_250_000)
    expect(parseVndDraft("1 250 000")).toBe(1_250_000)
    expect(parseVndDraft("-1")).toBeNull()
    expect(parseVndDraft("12.5 VND")).toBeNull()
  })

  it("parses generic number, currency, date, boolean, and blank drafts", () => {
    expect(parseWorkbookCellDraft("-1.234,50", "currency")).toEqual({ valid: true, value: -1234.5 })
    expect(parseWorkbookCellDraft("12.75", "number")).toEqual({ valid: true, value: 12.75 })
    expect(parseWorkbookCellDraft("0,125", "number")).toEqual({ valid: true, value: 0.125 })
    expect(parseWorkbookCellDraft("8%", "number", "0%")).toEqual({ valid: true, value: 0.08 })
    expect(parseWorkbookCellDraft("8,25%", "number", "0.00%")).toEqual({ valid: true, value: 0.0825 })
    expect(parseWorkbookCellDraft("1.234", "number")).toEqual({ valid: true, value: 1.234 })
    expect(parseWorkbookCellDraft("10.000", "number", "#,##0")).toEqual({ valid: true, value: 10_000 })
    expect(parseWorkbookCellDraft("1.234567890123456", "number").valid).toBe(false)
    expect(parseWorkbookCellDraft("2026-07-14", "date")).toEqual({ valid: true, value: "2026-07-14" })
    expect(parseWorkbookCellDraft("true", "boolean")).toEqual({ valid: true, value: true })
    expect(parseWorkbookCellDraft("", "boolean")).toEqual({ valid: true, value: null })
    expect(parseWorkbookCellDraft("not true", "boolean").valid).toBe(false)
    expect(parseWorkbookCellDraft("x".repeat(32_768), "text").valid).toBe(false)
  })

  it("renders numbers with the workbook precision", () => {
    expect(formatWorkbookValue(1_996_296.296296296, "#,##0.00")).toBe("1.996.296,30")
    expect(formatWorkbookValue(10_000, "#,##0")).toBe("10.000")
    expect(formatWorkbookValue(0.0825, "0.00%")).toBe("8,25%")
  })

  it("builds row-number keyed save changes", () => {
    const drafts = new Map([
      [25, { net_price: "1.250.000", selling_price: "1.400.000" }],
      [31, { selling_price: "2.000.000" }],
    ])

    const result = validateWorkbookDrafts(drafts, "invalid")

    expect(result.errors.size).toBe(0)
    expect(result.changes).toEqual([
      { row_number: 25, values: { net_price: 1_250_000, selling_price: 1_400_000 } },
      { row_number: 31, values: { selling_price: 2_000_000 } },
    ])
  })

  it("builds typed generic changes from column configuration", () => {
    const drafts = new Map([
      [7, {
        "source-text": "updated",
        "source-number": "-2.5",
        "source-date": "2026-07-14",
        "source-boolean": "false",
        "source-blank": "",
      }],
    ])
    const columns = [
      { id: "source-text", field: "source-text", label: "Text", editable: true, origin: "source" as const, data_type: "text" as const, hidden: false, sticky: false },
      { id: "source-number", field: "source-number", label: "Number", editable: true, origin: "source" as const, data_type: "number" as const, hidden: false, sticky: false },
      { id: "source-date", field: "source-date", label: "Date", editable: true, origin: "source" as const, data_type: "date" as const, hidden: false, sticky: false },
      { id: "source-boolean", field: "source-boolean", label: "Boolean", editable: true, origin: "source" as const, data_type: "boolean" as const, hidden: false, sticky: false },
      { id: "source-blank", field: "source-blank", label: "Blank", editable: true, origin: "source" as const, data_type: "number" as const, hidden: false, sticky: false },
    ]

    const result = validateWorkbookDrafts(drafts, "invalid", columns)

    expect(result.errors.size).toBe(0)
    expect(result.changes).toEqual([{ row_number: 7, values: {
      "source-text": "updated",
      "source-number": -2.5,
      "source-date": "2026-07-14",
      "source-boolean": false,
      "source-blank": null,
    } }])
  })

  it("retains valid cells while identifying invalid cell drafts", () => {
    const drafts = new Map([
      [25, { net_price: "not money", selling_price: "1.400.000" }],
    ])

    const result = validateWorkbookDrafts(drafts, "whole VND required")

    expect(result.errors.get("25:net_price")).toBe("whole VND required")
    expect(result.changes).toEqual([
      { row_number: 25, values: { selling_price: 1_400_000 } },
    ])
  })
})
