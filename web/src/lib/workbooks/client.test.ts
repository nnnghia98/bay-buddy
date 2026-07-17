import { beforeEach, describe, expect, it, vi } from "vitest"

const { expireStoredSession } = vi.hoisted(() => ({
  expireStoredSession: vi.fn(),
}))

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    status: number
    payload: unknown

    constructor(message: string, status: number, payload: unknown) {
      super(message)
      this.status = status
      this.payload = payload
    }
  }
  return { ApiError }
})

vi.mock("@/lib/auth-storage", () => ({
  expireStoredSession,
  getActiveStoredToken: () => "valid-token",
}))

import { ApiError } from "@/lib/api"
import {
  addWorkbookColumn,
  createWorkbookSession,
  discardWorkbookSession,
  downloadCurrentWorkbook,
  fetchLatestWorkbookSession,
  fetchWorkbookSession,
  lookupWorkbookCellValues,
  fetchWorkbookSessions,
  previewWorkbookFormula,
  parseDownloadFilename,
  renameWorkbookSession,
  saveWorkbookChanges,
  toWorkbookClientError,
  updateWorkbookColumn,
} from "@/lib/workbooks/client"

const sessionSummary = {
  id: "b128452e-c49f-4be8-9794-bb399c1fd050",
  display_name: "July prices",
  original_filename: "prices.xlsx",
  selected_sheet_name: "Tickets",
  current_version: 1,
  status: "DRAFT" as const,
  created_at: "2026-07-12T00:00:00Z",
  updated_at: "2026-07-12T00:00:00Z",
}

const sessionList = {
  items: [sessionSummary],
  pagination: { page: 1, page_size: 10, total: 1, total_pages: 1 },
}

const session = {
  id: "b128452e-c49f-4be8-9794-bb399c1fd050",
  workbook_id: "9ced3a7d-ec44-488b-b645-3bd904e4e3a4",
  original_filename: "prices.xlsx",
  selected_sheet_name: "Tickets",
  header_row_number: 1,
  column_mapping: { net_price: 3, selling_price: 4 },
  current_version: 1,
  status: "DRAFT" as const,
  created_at: "2026-07-12T00:00:00Z",
  updated_at: "2026-07-12T00:00:00Z",
  column_config: [],
}

beforeEach(() => {
  expireStoredSession.mockReset()
  vi.unstubAllGlobals()
})

describe("workbook client", () => {
  it("sends the selected header row when creating a session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: session, error: null })),
    )
    vi.stubGlobal("fetch", fetchMock)

    await createWorkbookSession({
      workbook_id: session.workbook_id,
      sheet_name: session.selected_sheet_name,
      header_row_number: 4,
    })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      workbook_id: session.workbook_id,
      sheet_name: session.selected_sheet_name,
      header_row_number: 4,
    })
  })

  it("sends the safe formula AST when adding a derived column", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: session, error: null })),
    )
    vi.stubGlobal("fetch", fetchMock)

    const formula = {
      schema_version: 1 as const,
      expression: {
        type: "binary" as const,
        operator: "-" as const,
        left: { type: "column" as const, column_id: "source-sale" },
        right: { type: "column" as const, column_id: "source-fare" },
      },
    }
    await addWorkbookColumn(session.id, 1, "Commission", "currency", formula)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      base_version: 1,
      label: "Commission",
      data_type: "currency",
      formula,
    })
  })

  it("previews and updates a versioned formula column", async () => {
    const formula = {
      schema_version: 1 as const,
      expression: {
        type: "round" as const,
        value: { type: "column" as const, column_id: "source-profit" },
        digits: 0,
      },
    }
    const preview = {
      valid: true,
      normalized_formula: formula,
      readable_expression: "ROUND(Profit,0)",
      referenced_column_ids: ["source-profit"],
      results: [{ row_number: 2, value: 100 }],
      errors: [],
      warnings: [],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: preview, error: null })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: session, error: null })))
    vi.stubGlobal("fetch", fetchMock)

    await expect(previewWorkbookFormula(session.id, {
      base_version: 1,
      formula,
      output_type: "currency",
      output_column_id: "user-profit",
    })).resolves.toEqual(preview)
    await updateWorkbookColumn(session.id, "user-profit", {
      base_version: 1,
      label: "Rounded profit",
      data_type: "currency",
      formula,
    })

    expect(fetchMock.mock.calls[0][0]).toBe(`/api/workbooks/sessions/${session.id}/formulas/preview`)
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/workbooks/sessions/${session.id}/columns/user-profit`)
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "PATCH" }))
  })

  it("looks up bounded cell values for draft reconciliation", async () => {
    const data = {
      session_id: session.id,
      version: 3,
      cells: [{ row_number: 2, column_id: "source-price", value: 1_200_000 }],
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data, error: null })),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(lookupWorkbookCellValues(session.id, {
      base_version: 3,
      cells: [{ row_number: 2, column_id: "source-price" }],
    })).resolves.toEqual(data)
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/workbooks/sessions/${session.id}/cell-values`,
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      base_version: 3,
      cells: [{ row_number: 2, column_id: "source-price" }],
    })
  })

  it("returns the latest restorable workbook session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: session, error: null })),
    ))

    await expect(fetchLatestWorkbookSession()).resolves.toEqual(session)
  })

  it("lists workbook sessions with encoded filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: sessionList, error: null })),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      fetchWorkbookSessions({
        page: 1,
        pageSize: 10,
        search: " July ",
        status: "DRAFT",
      }),
    ).resolves.toEqual(sessionList)
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/workbooks/sessions?page=1&page_size=10&search=July&status=DRAFT",
    )
  })

  it("renames and discards workbook sessions", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: sessionSummary, error: null }),
        ),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    await renameWorkbookSession(sessionSummary.id, { display_name: "July prices" })
    await discardWorkbookSession(sessionSummary.id)

    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/workbooks/sessions/${sessionSummary.id}`,
    )
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: "PATCH" }),
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      display_name: "July prices",
    })
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ method: "DELETE" }),
    )
  })

  it("uses the unwrapped data returned by the shared envelope client", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: session, error: null })),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchWorkbookSession(session.id)).resolves.toEqual(session)
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/workbooks/sessions/${session.id}`,
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
    expect((fetchMock.mock.calls[0][1].headers as Headers).get("Authorization")).toBe(
      "Bearer valid-token",
    )
  })

  it("validates save payloads before sending", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await expect(
      saveWorkbookChanges(session.id, {
        request_id: "08cd65a5-5464-43f6-a65f-51e73ac86942",
        base_version: 1,
        changes: [{ row_number: 2, values: { "source-number": Number.NaN } }],
      }),
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("preserves structured workbook error code and details", () => {
    const error = toWorkbookClientError(
      new ApiError("request failed", 409, {
        detail: {
          code: "VERSION_CONFLICT",
          message: "Workbook session has a newer version.",
          details: { current_version: 4 },
        },
      }),
    )

    expect(error.status).toBe(409)
    expect(error.code).toBe("VERSION_CONFLICT")
    expect(error.details).toEqual({ current_version: 4 })
  })

  it.each([
    ["attachment; filename=prices-edited-v2.xlsx", "prices-edited-v2.xlsx"],
    [
      "attachment; filename*=UTF-8''B%E1%BA%A3ng-gi%C3%A1.xlsx",
      "Bảng-giá.xlsx",
    ],
    [null, "workbook-edited.xlsx"],
  ])("parses download filename %s", (header, expected) => {
    expect(parseDownloadFilename(header)).toBe(expected)
  })

  it("downloads binary output with bearer auth and response metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(["xlsx-bytes"]), {
        status: 200,
        headers: {
          "Content-Disposition": "attachment; filename=prices-edited-v2.xlsx",
          "Content-Length": "10",
          ETag: '"abc123"',
          "X-Workbook-Version": "2",
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await downloadCurrentWorkbook(session.id)

    expect(result.filename).toBe("prices-edited-v2.xlsx")
    expect(result.checksum).toBe("abc123")
    expect(result.version).toBe(2)
    const request = fetchMock.mock.calls[0]
    expect(request[0]).toBe(`/api/workbooks/sessions/${session.id}/download`)
    expect((request[1].headers as Headers).get("Authorization")).toBe(
      "Bearer valid-token",
    )
  })

  it("expires the stored session for unauthorized downloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: { code: "UNAUTHORIZED", message: "Sign in again.", details: {} },
          }),
          { status: 401 },
        ),
      ),
    )

    await expect(downloadCurrentWorkbook(session.id)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    })
    expect(expireStoredSession).toHaveBeenCalledWith("unauthorized")
  })
})
