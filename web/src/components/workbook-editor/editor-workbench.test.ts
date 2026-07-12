import { describe, expect, it } from "vitest"

import { validateWorkbookDrafts } from "./editor-workbench"
import { parseVndDraft } from "./editable-price-cell"

describe("workbook editor cell drafts", () => {
  it("parses Vietnamese-friendly whole-VND input", () => {
    expect(parseVndDraft("1.250.000")).toBe(1_250_000)
    expect(parseVndDraft("1 250 000")).toBe(1_250_000)
    expect(parseVndDraft("-1")).toBeNull()
    expect(parseVndDraft("12.5 VND")).toBeNull()
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
