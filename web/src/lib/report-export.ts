const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh"
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export type ReportWorkbookCell = string | number

export function getMonthlyDebtReportFilename(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    month: "numeric",
    year: "numeric",
  }).formatToParts(date)
  const month = parts.find((part) => part.type === "month")?.value
  const year = parts.find((part) => part.type === "year")?.value

  if (!month || !year) {
    throw new Error("Unable to create the monthly debt report filename.")
  }

  return `cong-no-thang-${month}-${year}.xlsx`
}

export async function buildReportWorkbookBytes(
  headers: string[],
  rows: ReportWorkbookCell[][],
  numericColumnIndexes: number[],
): Promise<Uint8Array<ArrayBuffer>> {
  const { Workbook } = await import("exceljs")
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet("Công nợ", {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  worksheet.addRow(headers)
  rows.forEach((row) => worksheet.addRow(row))

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: "FF202222" } }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F1F0" },
  }
  headerRow.alignment = { vertical: "middle" }
  headerRow.height = 22

  const numericColumns = new Set(numericColumnIndexes)

  worksheet.columns.forEach((column, index) => {
    const values = [headers[index] ?? "", ...rows.map((row) => row[index] ?? "")]
    const longestValue = Math.max(
      ...values.map((value) => String(value).length),
      10,
    )
    column.width = Math.min(longestValue + 2, 40)

    if (numericColumns.has(index)) {
      column.numFmt = "#,##0"
      column.alignment = { horizontal: "right" }
    }
  })

  if (headers.length > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer)
}

export function createXlsxBlob(bytes: Uint8Array<ArrayBuffer>): Blob {
  return new Blob([bytes], { type: XLSX_MIME_TYPE })
}
