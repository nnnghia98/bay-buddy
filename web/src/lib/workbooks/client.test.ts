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
  downloadCurrentWorkbook,
  fetchLatestWorkbookSession,
  fetchWorkbookSession,
  parseDownloadFilename,
  saveWorkbookChanges,
  toWorkbookClientError,
} from "@/lib/workbooks/client"

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
  it("sends the safe formula AST when adding a derived column", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: session, error: null })),
    )
    vi.stubGlobal("fetch", fetchMock)

    await addWorkbookColumn(session.id, 1, "Commission", "currency", {
      left_column_id: "source-fare",
      operator: "%",
      right_column_id: "source-rate",
    })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      base_version: 1,
      label: "Commission",
      data_type: "currency",
      formula: {
        left_column_id: "source-fare",
        operator: "%",
        right_column_id: "source-rate",
      },
    })
  })

  it("returns the latest restorable workbook session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: session, error: null })),
    ))

    await expect(fetchLatestWorkbookSession()).resolves.toEqual(session)
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
        changes: [{ row_number: 2, values: { net_price: -1 } }],
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
