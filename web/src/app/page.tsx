import { FinancialSummaryDashboard } from "@/components/financial-summary-dashboard"
import { fetchDashboardSummary } from "@/lib/server-dashboard"
import { unstable_rethrow } from "next/navigation"

export default async function Home() {
  let summary = null

  try {
    summary = await fetchDashboardSummary()
  } catch (error) {
    unstable_rethrow(error)
    console.error("[dashboard] Failed to load dashboard summary", error)
  }

  return <FinancialSummaryDashboard summary={summary} />
}
