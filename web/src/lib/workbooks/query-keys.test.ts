import { describe, expect, it } from "vitest"

import {
  buildWorkbookRecordsPath,
  workbookQueryKeys,
} from "@/lib/workbooks/query-keys"

describe("workbook record queries", () => {
  it("encodes search and supported sort parameters", () => {
    expect(
      buildWorkbookRecordsPath("session-id", {
        page: 2,
        pageSize: 50,
        search: " Nguyễn & An ",
        sortBy: "selling_price",
        sortDirection: "desc",
      }),
    ).toBe(
      "/workbooks/sessions/session-id/records?page=2&page_size=50&search=Nguy%E1%BB%85n+%26+An&sort_by=selling_price&sort_direction=desc",
    )
  })

  it("keys records by version and every interactive query value", () => {
    expect(
      workbookQueryKeys.records("session-id", {
        version: 3,
        page: 2,
        pageSize: 25,
        search: " ABC ",
        sortBy: "pnr",
        sortDirection: "asc",
      }),
    ).toEqual([
      "workbooks",
      "session",
      "session-id",
      "records",
      2,
      3,
      2,
      25,
      "ABC",
      "pnr",
      "asc",
    ])
  })
})
