import type { WorkbookSemanticField } from "@/schemas/workbook"

const WORKBOOK_RECORDS_SCHEMA_VERSION = 2

export type WorkbookRecordsRequestQuery = {
  page: number
  pageSize: number
  search?: string
  sortBy?: WorkbookSemanticField
  sortDirection?: "asc" | "desc"
}

export type WorkbookRecordsQuery = WorkbookRecordsRequestQuery & { version: number }

export function buildWorkbookRecordsPath(
  sessionId: string,
  query: Partial<WorkbookRecordsRequestQuery> = {},
): string {
  const parameters = new URLSearchParams()
  if (query.page !== undefined) parameters.set("page", String(query.page))
  if (query.pageSize !== undefined) parameters.set("page_size", String(query.pageSize))
  if (query.search?.trim()) parameters.set("search", query.search.trim())
  if (query.sortBy) parameters.set("sort_by", query.sortBy)
  if (query.sortDirection) parameters.set("sort_direction", query.sortDirection)
  const encoded = parameters.toString()
  return `/workbooks/sessions/${sessionId}/records${encoded ? `?${encoded}` : ""}`
}

export const workbookQueryKeys = {
  all: ["workbooks"] as const,
  session: (sessionId: string) =>
    [...workbookQueryKeys.all, "session", sessionId] as const,
  records: (sessionId: string, query: WorkbookRecordsQuery) =>
    [
      ...workbookQueryKeys.session(sessionId),
      "records",
      WORKBOOK_RECORDS_SCHEMA_VERSION,
      query.version,
      query.page,
      query.pageSize,
      query.search?.trim() ?? "",
      query.sortBy ?? null,
      query.sortDirection ?? "asc",
    ] as const,
  recordsRoot: (sessionId: string) =>
    [...workbookQueryKeys.session(sessionId), "records"] as const,
}
