import "server-only"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import {
  workbookRecordsPageSchema,
  workbookSessionListSchema,
  workbookSessionSchema,
  type WorkbookRecordsPage,
  type WorkbookSession,
  type WorkbookSessionList,
} from "@/schemas/workbook"
import {
  buildWorkbookRecordsPath,
  buildWorkbookSessionsPath,
  type WorkbookRecordsRequestQuery,
  type WorkbookSessionListQuery,
} from "./query-keys"

export async function fetchWorkbookSessionsServer(
  query: Partial<WorkbookSessionListQuery> = {},
): Promise<WorkbookSessionList> {
  const payload = await fetchAuthenticatedApiPayload(
    buildWorkbookSessionsPath(query),
    "Unable to load workbook sessions.",
  )
  return workbookSessionListSchema.parse(getEnvelopeData(payload))
}

export async function fetchWorkbookSessionServer(
  sessionId: string,
): Promise<WorkbookSession> {
  const payload = await fetchAuthenticatedApiPayload(
    `/workbooks/sessions/${sessionId}`,
    "Unable to load workbook session.",
  )
  return workbookSessionSchema.parse(getEnvelopeData(payload))
}

export async function fetchWorkbookRecordsServer(
  sessionId: string,
  query: Partial<WorkbookRecordsRequestQuery> = {},
): Promise<WorkbookRecordsPage> {
  const payload = await fetchAuthenticatedApiPayload(
    buildWorkbookRecordsPath(sessionId, query),
    "Unable to load workbook records.",
  )
  return workbookRecordsPageSchema.parse(getEnvelopeData(payload))
}
