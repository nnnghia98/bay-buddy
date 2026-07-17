import { describe, expect, it } from "vitest"

import {
  buildWorkbookRecordsPath,
  buildWorkbookSessionsPath,
  workbookQueryKeys,
} from "@/lib/workbooks/query-keys"

describe("workbook session queries", () => {
  it("encodes pagination, normalized search, and status", () => {
    expect(
      buildWorkbookSessionsPath({
        page: 2,
        pageSize: 10,
        search: " July prices ",
        status: "DRAFT",
      }),
    ).toBe(
      "/workbooks/sessions?page=2&page_size=10&search=July+prices&status=DRAFT",
    )
  })

  it("keys the library by every server query value", () => {
    expect(
      workbookQueryKeys.sessions({
        page: 2,
        pageSize: 10,
        search: " July prices ",
        status: "DRAFT",
      }),
    ).toEqual(["workbooks", "sessions", 2, 10, "July prices", "DRAFT"])
  })
})

describe("workbook record queries", () => {
  it("encodes search and supported sort parameters", () => {
    expect(
      buildWorkbookRecordsPath("session-id", {
        page: 2,
        pageSize: 50,
        search: " Nguyễn & An ",
        sortBy: "source-8a7f",
        sortDirection: "desc",
      }),
    ).toBe(
      "/workbooks/sessions/session-id/records?page=2&page_size=50&search=Nguy%E1%BB%85n+%26+An&sort_by=source-8a7f&sort_direction=desc",
    )
  })

  it("keys records by version and every interactive query value", () => {
    expect(
      workbookQueryKeys.records("session-id", {
        version: 3,
        page: 2,
        pageSize: 25,
        search: " ABC ",
        sortBy: "source-pnr",
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
      "source-pnr",
      "asc",
    ])
  })
})
