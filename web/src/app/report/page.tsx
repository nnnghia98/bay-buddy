import { LedgerReportClient } from "@/app/report/report-client"
import { fetchTicketDebtRows } from "@/lib/server-report"

export default async function ReportPage() {
  const rows = await fetchTicketDebtRows()

  return <LedgerReportClient initialFrom="" initialTo="" rows={rows} />
}
