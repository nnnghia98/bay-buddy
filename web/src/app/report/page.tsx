import { LedgerReportClient } from "@/app/report/report-client"
import { fetchLedgerReportRows } from "@/lib/server-report"

export default async function ReportPage() {
  const rows = await fetchLedgerReportRows()

  return <LedgerReportClient initialFrom="" initialTo="" rows={rows} />
}
