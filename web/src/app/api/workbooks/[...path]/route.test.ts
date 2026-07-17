import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api-base", () => ({
  buildApiUrl: (path: string, base: string) => `${base}${path}`,
  getServerApiBaseUrl: () => "http://api.internal/api/v1",
}))

import { DELETE, GET, PATCH, POST } from "./route"

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe("workbook same-origin proxy", () => {
  it("forwards query parameters, bearer auth, and JSON bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: "session" } }), {
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const request = new Request("http://web.test/api/workbooks/sessions?draft=true", {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workbook_id: "workbook" }),
    })

    const response = await POST(request, {
      params: Promise.resolve({ path: ["sessions"] }),
    })

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toBe("http://api.internal/api/v1/workbooks/sessions?draft=true")
    expect((init.headers as Headers).get("authorization")).toBe("Bearer token")
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toContain("workbook_id")
    expect(response.status).toBe(200)
  })

  it("preserves binary download metadata and response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("xlsx", {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": "attachment; filename=edited.xlsx",
            ETag: '"checksum"',
            "X-Workbook-Version": "3",
          },
        }),
      ),
    )

    const response = await GET(
      new Request("http://web.test/api/workbooks/sessions/id/download"),
      { params: Promise.resolve({ path: ["sessions", "id", "download"] }) },
    )

    expect(await response.text()).toBe("xlsx")
    expect(response.headers.get("content-disposition")).toContain("edited.xlsx")
    expect(response.headers.get("etag")).toBe('"checksum"')
    expect(response.headers.get("x-workbook-version")).toBe("3")
  })

  it("forwards column-configuration PATCH requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ success: true, data: { id: "session" } }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const request = new Request(
      "http://web.test/api/workbooks/sessions/id/column-configuration",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hidden_column_ids: ["source-1"],
          sticky_column_ids: [],
        }),
      },
    )

    const response = await PATCH(request, {
      params: Promise.resolve({
        path: ["sessions", "id", "column-configuration"],
      }),
    })

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toBe(
      "http://api.internal/api/v1/workbooks/sessions/id/column-configuration",
    )
    expect(init.method).toBe("PATCH")
    expect(response.status).toBe(200)
  })

  it("forwards session DELETE requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ success: true, data: { id: "session", status: "DISCARDED" } }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = await DELETE(
      new Request("http://web.test/api/workbooks/sessions/id", {
        method: "DELETE",
        headers: { Authorization: "Bearer token" },
      }),
      { params: Promise.resolve({ path: ["sessions", "id"] }) },
    )

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(url.toString()).toBe("http://api.internal/api/v1/workbooks/sessions/id")
    expect(init.method).toBe("DELETE")
    expect((init.headers as Headers).get("authorization")).toBe("Bearer token")
    expect(response.status).toBe(200)
  })

  it("returns a structured 502 when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))

    const response = await GET(
      new Request("http://web.test/api/workbooks/uploads"),
      { params: Promise.resolve({ path: ["uploads"] }) },
    )

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({
      detail: { code: "UPSTREAM_UNAVAILABLE" },
    })
  })
})
