import "server-only"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import {
  TicketImportListSchema,
  TicketImportSchema,
  type TicketImport,
} from "@/schemas"

export async function fetchTicketImports(limit = 50): Promise<TicketImport[]> {
  const payload = await fetchAuthenticatedApiPayload(
    `/ticket-imports?limit=${limit}`,
    "Unable to load ticket imports.",
  )

  return TicketImportListSchema.parse(getEnvelopeData(payload))
}

export async function fetchTicketImport(importId: string): Promise<TicketImport> {
  const payload = await fetchAuthenticatedApiPayload(
    `/ticket-imports/${importId}`,
    "Unable to load ticket import.",
  )

  return TicketImportSchema.parse(getEnvelopeData(payload))
}

