import { describe, expect, it } from "vitest"
import { Workbook } from "exceljs"

import {
  buildReportWorkbookBytes,
  getMonthlyDebtReportFilename,
} from "@/lib/report-export"

describe("getMonthlyDebtReportFilename", () => {
  it("uses the Vietnam month and year without zero-padding the month", () => {
    const date = new Date("2026-12-31T17:30:00.000Z")

    expect(getMonthlyDebtReportFilename(date)).toBe(
      "cong-no-thang-1-2027.xlsx",
    )
  })
})

describe("buildReportWorkbookBytes", () => {
  it("creates a valid xlsx workbook with numeric debt cells", async () => {
    const bytes = await buildReportWorkbookBytes(
      ["Khách hàng", "Công nợ"],
      [["Nguyễn Văn An", 1_500_000]],
      [1],
    )
    const workbook = new Workbook()

    await workbook.xlsx.load(bytes.buffer)

    const worksheet = workbook.getWorksheet("Công nợ")
    expect(worksheet?.getCell("A2").value).toBe("Nguyễn Văn An")
    expect(worksheet?.getCell("B2").value).toBe(1_500_000)
    expect(worksheet?.getCell("B2").numFmt).toBe("#,##0")
  })
})
