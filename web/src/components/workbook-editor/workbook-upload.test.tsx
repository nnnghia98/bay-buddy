import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { WorkbookUpload } from "@/components/workbook-editor/workbook-upload"

const labels = {
  choose: "Chọn tệp Excel",
  drop: "hoặc kéo tệp vào đây",
  supported: "Chỉ hỗ trợ .xlsx hoặc .xls",
  selected: "Tệp đã chọn",
  change: "Chọn tệp khác",
  upload: "Tải lên",
  uploading: "Đang tải lên",
}

describe("WorkbookUpload", () => {
  it("renders an accessible Excel chooser without fake progress", () => {
    const html = renderToStaticMarkup(
      <WorkbookUpload
        file={null}
        labels={labels}
        onFileChange={vi.fn()}
        onInvalidFile={vi.fn()}
        onUpload={vi.fn()}
      />,
    )

    expect(html).toContain('type="file"')
    expect(html).toContain('accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"')
    expect(html).toContain("Chọn tệp Excel")
    expect(html).toContain("Chỉ hỗ trợ .xlsx hoặc .xls")
    expect(html).not.toContain("progressbar")
  })

  it("shows the selected filename and exact pending action label", () => {
    const file = new File(["xlsx"], "bang-gia.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const html = renderToStaticMarkup(
      <WorkbookUpload
        disabled
        file={file}
        labels={labels}
        onFileChange={vi.fn()}
        onInvalidFile={vi.fn()}
        onUpload={vi.fn()}
        pending
      />,
    )

    expect(html).toContain("bang-gia.xlsx")
    expect(html).toContain("Đang tải lên")
    expect(html).toContain("disabled")
  })
})
