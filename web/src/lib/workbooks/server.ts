import "server-only"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import {
  workbookRecordsPageSchema,
  workbookSessionSchema,
  type WorkbookRecordsPage,
  type WorkbookSession,
} from "@/schemas/workbook"
import {
  buildWorkbookRecordsPath,
  type WorkbookRecordsRequestQuery,
} from "./query-keys"

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
