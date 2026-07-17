import { ApiError } from "@/lib/api"
import type { components } from "@/lib/api/generated"
import { expireStoredSession, getActiveStoredToken } from "@/lib/auth-storage"
import {
  workbookCellValueLookupRequestSchema,
  workbookCellValueLookupResponseSchema,
  workbookFormulaPreviewRequestSchema,
  workbookFormulaPreviewResponseSchema,
  workbookRecordsPageSchema,
  workbookSaveRequestSchema,
  workbookSaveResponseSchema,
  workbookSessionListSchema,
  workbookSessionSchema,
  workbookSessionSummarySchema,
  workbookUpdateColumnRequestSchema,
  workbookUploadSchema,
  type WorkbookCellValueLookupRequest,
  type WorkbookCellValueLookupResponse,
  type WorkbookRecordsPage,
  type WorkbookSaveRequest,
  type WorkbookSaveResponse,
  type WorkbookSession,
  type WorkbookSessionList,
  type WorkbookSessionSummary,
  type WorkbookUpload,
  type WorkbookColumnDataType,
  type WorkbookColumnFormula,
  type WorkbookFormulaPreviewRequest,
  type WorkbookFormulaPreviewResponse,
  type WorkbookUpdateColumnRequest,
} from "@/schemas/workbook"
import { ZodError } from "zod"
import {
  buildWorkbookRecordsPath,
  buildWorkbookSessionsPath,
  type WorkbookRecordsRequestQuery,
  type WorkbookSessionListQuery,
} from "./query-keys"

type WorkbookSessionCreateRequest =
  components["schemas"]["WorkbookSessionCreateRequest"]
type WorkbookSessionRenameRequest =
  components["schemas"]["WorkbookSessionRenameRequest"]

export class WorkbookClientError extends Error {
  status: number
  code: string
  details: Record<string, unknown>

  constructor(
    message: string,
    { status, code, details = {} }: {
      status: number
      code: string
      details?: Record<string, unknown>
    },
  ) {
    super(message)
    this.name = "WorkbookClientError"
    this.status = status
    this.code = code
    this.details = details
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function toWorkbookClientError(error: unknown): WorkbookClientError {
  if (error instanceof WorkbookClientError) {
    return error
  }

  if (error instanceof ApiError) {
    const payload = isRecord(error.payload) ? error.payload : {}
    const detail = isRecord(payload.detail) ? payload.detail : payload
    const code = typeof detail.code === "string" ? detail.code : "REQUEST_FAILED"
    const message = typeof detail.message === "string" ? detail.message : error.message
    const details = isRecord(detail.details) ? detail.details : {}
    return new WorkbookClientError(message, {
      status: error.status,
      code,
      details,
    })
  }

  if (error instanceof ZodError) {
    return new WorkbookClientError("Workbook response validation failed.", {
      status: 0,
      code: "INVALID_RESPONSE",
      details: { issues: error.issues },
    })
  }

  return new WorkbookClientError(
    error instanceof Error ? error.message : "Workbook request failed.",
    { status: 0, code: "NETWORK_ERROR" },
  )
}

async function workbookJsonRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request()
  } catch (error) {
    throw toWorkbookClientError(error)
  }
}

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: string | null
}

async function workbookApiFetchData<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getActiveStoredToken()
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`/api/workbooks/${path.replace(/^\//, "")}`, {
    ...init,
    headers,
  })
  const payload = await parseErrorPayload(response)

  if (!response.ok) {
    if (response.status === 401) expireStoredSession("unauthorized")
    throw new ApiError(
      `Workbook request failed with status ${response.status}`,
      response.status,
      payload,
    )
  }

  if (
    isRecord(payload) &&
    typeof payload.success === "boolean" &&
    "data" in payload
  ) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export async function uploadWorkbook(file: File): Promise<WorkbookUpload> {
  const body = new FormData()
  body.append("file", file)
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookUpload>("uploads", { method: "POST", body }),
  )
  return workbookUploadSchema.parse(payload)
}

export async function createWorkbookSession(
  request: WorkbookSessionCreateRequest,
): Promise<WorkbookSession> {
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookSession>("sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }),
  )
  return workbookSessionSchema.parse(payload)
}

export async function addWorkbookColumn(
  sessionId: string,
  baseVersion: number,
  label: string,
  dataType: WorkbookColumnDataType,
  formula?: WorkbookColumnFormula,
): Promise<WorkbookSession> {
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookSession>(`sessions/${sessionId}/columns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_version: baseVersion, label, data_type: dataType, formula }),
    }),
  )
  return workbookSessionSchema.parse(payload)
}

export async function previewWorkbookFormula(
  sessionId: string,
  request: WorkbookFormulaPreviewRequest,
): Promise<WorkbookFormulaPreviewResponse> {
  const validated = workbookFormulaPreviewRequestSchema.parse(request)
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookFormulaPreviewResponse>(
      `sessions/${sessionId}/formulas/preview`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      },
    ),
  )
  return workbookFormulaPreviewResponseSchema.parse(payload)
}

export async function updateWorkbookColumn(
  sessionId: string,
  columnId: string,
  request: WorkbookUpdateColumnRequest,
): Promise<WorkbookSession> {
  const validated = workbookUpdateColumnRequestSchema.parse(request)
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookSession>(`sessions/${sessionId}/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated),
    }),
  )
  return workbookSessionSchema.parse(payload)
}

export async function removeWorkbookColumn(sessionId: string, columnId: string, baseVersion: number): Promise<WorkbookSession> {
  const payload = await workbookJsonRequest(() => workbookApiFetchData<WorkbookSession>(
    `sessions/${sessionId}/columns/${columnId}/remove`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base_version: baseVersion }) },
  ))
  return workbookSessionSchema.parse(payload)
}

export async function updateWorkbookColumnConfiguration(
  sessionId: string,
  baseVersion: number,
  hiddenColumnIds: string[],
  stickyColumnIds: string[],
): Promise<WorkbookSession> {
  const payload = await workbookJsonRequest(() => workbookApiFetchData<WorkbookSession>(
    `sessions/${sessionId}/column-configuration`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base_version: baseVersion, hidden_column_ids: hiddenColumnIds, sticky_column_ids: stickyColumnIds }) },
  ))
  return workbookSessionSchema.parse(payload)
}

export async function fetchWorkbookSession(
  sessionId: string,
): Promise<WorkbookSession> {
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookSession>(`sessions/${sessionId}`),
  )
  return workbookSessionSchema.parse(payload)
}

export async function fetchLatestWorkbookSession(): Promise<WorkbookSession | null> {
  try {
    const payload = await workbookJsonRequest(() =>
      workbookApiFetchData<WorkbookSession>("sessions/latest"),
    )
    return workbookSessionSchema.parse(payload)
  } catch (error) {
    const requestError = toWorkbookClientError(error)
    if (requestError.status === 404 && requestError.code === "SESSION_NOT_FOUND") {
      return null
    }
    throw requestError
  }
}

export async function fetchWorkbookSessions(
  query: Partial<WorkbookSessionListQuery> = {},
): Promise<WorkbookSessionList> {
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookSessionList>(
      buildWorkbookSessionsPath(query).replace(/^\/workbooks\//, ""),
    ),
  )
  return workbookSessionListSchema.parse(payload)
}

export async function renameWorkbookSession(
  sessionId: string,
  request: WorkbookSessionRenameRequest,
): Promise<WorkbookSessionSummary> {
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookSessionSummary>(`sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }),
  )
  return workbookSessionSummarySchema.parse(payload)
}

export async function discardWorkbookSession(
  sessionId: string,
): Promise<WorkbookSessionSummary> {
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookSessionSummary>(`sessions/${sessionId}`, {
      method: "DELETE",
    }),
  )
  return workbookSessionSummarySchema.parse(payload)
}

export type FetchWorkbookRecordsQuery = Partial<WorkbookRecordsRequestQuery>
export { buildWorkbookRecordsPath, buildWorkbookSessionsPath }

export async function fetchWorkbookRecords(
  sessionId: string,
  query: FetchWorkbookRecordsQuery = {},
): Promise<WorkbookRecordsPage> {
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookRecordsPage>(
      buildWorkbookRecordsPath(sessionId, query).replace(/^\/workbooks\//, ""),
    ),
  )
  return workbookRecordsPageSchema.parse(payload)
}

export async function lookupWorkbookCellValues(
  sessionId: string,
  request: WorkbookCellValueLookupRequest,
): Promise<WorkbookCellValueLookupResponse> {
  const validated = workbookCellValueLookupRequestSchema.parse(request)
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookCellValueLookupResponse>(
      `sessions/${sessionId}/cell-values`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      },
    ),
  )
  return workbookCellValueLookupResponseSchema.parse(payload)
}

export async function saveWorkbookChanges(
  sessionId: string,
  request: WorkbookSaveRequest,
): Promise<WorkbookSaveResponse> {
  const validated = workbookSaveRequestSchema.parse(request)
  const payload = await workbookJsonRequest(() =>
    workbookApiFetchData<WorkbookSaveResponse>(`sessions/${sessionId}/saves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated),
    }),
  )
  return workbookSaveResponseSchema.parse(payload)
}

export type WorkbookDownload = {
  blob: Blob
  filename: string
  checksum: string | null
  fileSize: number
  version: number | null
}

export function parseDownloadFilename(header: string | null): string {
  if (!header) return "workbook-edited.xlsx"
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i)?.[1]
  const plain = header.match(/filename=([^;]+)/i)?.[1]
  return (quoted ?? plain ?? "workbook-edited.xlsx").trim()
}

async function parseErrorPayload(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function downloadCurrentWorkbook(
  sessionId: string,
): Promise<WorkbookDownload> {
  const token = getActiveStoredToken()
  const headers = new Headers()
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const response = await fetch(`/api/workbooks/sessions/${sessionId}/download`, {
    headers,
  })
  if (!response.ok) {
    const payload = await parseErrorPayload(response)
    if (response.status === 401) expireStoredSession("unauthorized")
    throw toWorkbookClientError(
      new ApiError(`Download failed with status ${response.status}`, response.status, payload),
    )
  }

  const blob = await response.blob()
  const rawVersion = response.headers.get("X-Workbook-Version")
  const version = rawVersion && /^\d+$/.test(rawVersion) ? Number(rawVersion) : null
  return {
    blob,
    filename: parseDownloadFilename(response.headers.get("Content-Disposition")),
    checksum: response.headers.get("ETag")?.replace(/^"|"$/g, "") ?? null,
    fileSize: Number(response.headers.get("Content-Length") ?? blob.size),
    version,
  }
}
