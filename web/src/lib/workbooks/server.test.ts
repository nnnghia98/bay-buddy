import { beforeEach, describe, expect, it, vi } from "vitest"

const { fetchAuthenticatedApiPayload, getEnvelopeData } = vi.hoisted(() => ({
  fetchAuthenticatedApiPayload: vi.fn(),
  getEnvelopeData: vi.fn((payload: unknown) =>
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data: unknown }).data
      : payload,
  ),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/server-api", () => ({
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
}))

import {
  fetchWorkbookRecordsServer,
  fetchWorkbookSessionServer,
} from "@/lib/workbooks/server"

const session = {
  id: "b128452e-c49f-4be8-9794-bb399c1fd050",
  workbook_id: "9ced3a7d-ec44-488b-b645-3bd904e4e3a4",
  original_filename: "prices.xlsx",
  selected_sheet_name: "Tickets",
  header_row_number: 1,
  column_mapping: { net_price: 3, selling_price: 4 },
  current_version: 1,
  status: "DRAFT",
  created_at: "2026-07-12T00:00:00Z",
  updated_at: "2026-07-12T00:00:00Z",
  column_config: [],
}

beforeEach(() => {
  fetchAuthenticatedApiPayload.mockReset()
  getEnvelopeData.mockClear()
})

describe("workbook RSC data helpers", () => {
  it("unwraps and validates session envelopes", async () => {
    fetchAuthenticatedApiPayload.mockResolvedValue({
      success: true,
      data: session,
      error: null,
    })

    await expect(fetchWorkbookSessionServer(session.id)).resolves.toEqual(session)
    expect(getEnvelopeData).toHaveBeenCalledOnce()
  })

  it("encodes record queries before authenticated server fetch", async () => {
    fetchAuthenticatedApiPayload.mockResolvedValue({
      success: true,
      data: {
        session_id: session.id,
        version: 1,
        sheet_name: "Tickets",
        columns: [],
        items: [],
        pagination: { page: 2, page_size: 25, total: 0, total_pages: 0 },
      },
      error: null,
    })

    await fetchWorkbookRecordsServer(session.id, {
      page: 2,
      pageSize: 25,
      search: "ABC 123",
    })

    expect(fetchAuthenticatedApiPayload).toHaveBeenCalledWith(
      `/workbooks/sessions/${session.id}/records?page=2&page_size=25&search=ABC+123`,
      "Unable to load workbook records.",
    )
  })
})
