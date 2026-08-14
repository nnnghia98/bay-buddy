import "server-only"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import {
  DashboardSummarySchema,
  type DashboardSummary,
} from "@/schemas/dashboard"

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const payload = await fetchAuthenticatedApiPayload(
    "/finance/dashboard-summary",
    "Unable to load the dashboard summary.",
  )

  return DashboardSummarySchema.parse(getEnvelopeData(payload))
}
