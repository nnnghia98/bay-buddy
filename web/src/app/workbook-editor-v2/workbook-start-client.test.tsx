import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { WorkbookStartClient } from "@/app/workbook-editor-v2/workbook-start-client"
import { WorkbookSessionLibrary } from "@/components/workbook-editor/workbook-session-library"
import type { WorkbookSessionList } from "@/schemas/workbook"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/locales/client", () => ({
  useI18n: () => (key: string) => key,
}))

vi.mock("@/lib/workbooks/client", () => ({
  uploadWorkbook: vi.fn(),
  createWorkbookSession: vi.fn(),
  fetchWorkbookSessions: vi.fn(),
  renameWorkbookSession: vi.fn(),
  discardWorkbookSession: vi.fn(),
  toWorkbookClientError: (error: unknown) => ({
    code: "REQUEST_FAILED",
    message: error instanceof Error ? error.message : "Request failed",
  }),
}))

const initialSessions: WorkbookSessionList = {
  items: [
    {
      id: "b128452e-c49f-4be8-9794-bb399c1fd050",
      display_name: "July supplier prices",
      original_filename: "prices.xlsx",
      selected_sheet_name: "Tickets",
      current_version: 3,
      status: "DRAFT",
      created_at: "2026-07-12T00:00:00Z",
      updated_at: "2026-07-14T02:30:00Z",
    },
  ],
  pagination: { page: 1, page_size: 10, total: 1, total_pages: 1 },
}

function renderStartClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <WorkbookStartClient
        initialSessions={initialSessions}
        userId="2a7858e8-e1d0-4cda-a08d-9f86ac9e734b"
      />
    </QueryClientProvider>,
  )
}

describe("WorkbookStartClient", () => {
  it("renders upload workflow and the server-backed session library", () => {
    const html = renderStartClient()

    expect(html).toContain("workbookEditor.start.title")
    expect(html).toContain("workbookEditor.start.originalProtected")
    expect(html).toContain("workbookEditor.upload.choose")
    expect(html).toContain("workbookEditor.sheets.emptyTitle")
    expect(html).toContain("workbookEditor.library.title")
    expect(html).toContain("July supplier prices")
    expect(html).toContain("workbookEditor.library.columns.name")
    expect(html).toContain("workbookEditor.library.columns.updated")
    expect(html).toContain("workbookEditor.library.columns.actions")
    expect(html).not.toContain("workbookEditor.library.searchAction")
    expect(html).not.toContain("workbookEditor.library.columns.sheet")
    expect(html).not.toContain("workbookEditor.library.columns.version")
    expect(html).not.toContain("workbookEditor.library.columns.status")
  })

  it("renders open, rename, and delete actions for active sessions", () => {
    const html = renderStartClient()

    expect(html).toContain("workbookEditor.library.actions.open")
    expect(html).toContain("workbookEditor.library.actions.rename")
    expect(html).toContain("workbookEditor.library.actions.delete")
    expect(html).not.toContain("preferences")
  })

  it("shows the clear action when a session has local changes", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <WorkbookSessionLibrary
          initialData={initialSessions}
          localStateBySessionId={{
            "b128452e-c49f-4be8-9794-bb399c1fd050": "conflict",
          }}
          userId="2a7858e8-e1d0-4cda-a08d-9f86ac9e734b"
        />
      </QueryClientProvider>,
    )

    expect(html).toContain("workbookEditor.library.actions.clearLocal")
  })
})
