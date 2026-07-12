import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { WorkbookStartClient } from "@/app/workbook-editor-v2/workbook-start-client"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/locales/client", () => ({
  useI18n: () => (key: string) => key,
}))

vi.mock("@/lib/workbooks/client", () => ({
  uploadWorkbook: vi.fn(),
  createWorkbookSession: vi.fn(),
  toWorkbookClientError: (error: unknown) => ({
    code: "REQUEST_FAILED",
    message: error instanceof Error ? error.message : "Request failed",
  }),
}))

describe("WorkbookStartClient", () => {
  it("renders one upload-first operational surface", () => {
    const html = renderToStaticMarkup(<WorkbookStartClient />)

    expect(html).toContain("workbookEditor.start.title")
    expect(html).toContain("workbookEditor.start.originalProtected")
    expect(html).toContain("workbookEditor.upload.choose")
    expect(html).toContain("workbookEditor.sheets.emptyTitle")
    expect(html.match(/<section/g)).toHaveLength(1)
  })

  it("does not render deferred workbook-library or formula controls", () => {
    const html = renderToStaticMarkup(<WorkbookStartClient />)

    expect(html).not.toContain("formula")
    expect(html).not.toContain("history")
    expect(html).not.toContain("preferences")
    expect(html).not.toContain("workbookEditor.library")
  })
})
