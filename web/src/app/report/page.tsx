import { LedgerReportClient } from "@/app/report/report-client"
import { fetchTicketDebtPage } from "@/lib/server-report"

export default async function ReportPage() {
  const reportPage = await fetchTicketDebtPage({ page: 1, page_size: 50 })

  return (
    <LedgerReportClient
      initialFrom=""
      initialPage={reportPage}
      initialTo=""
    />
  )
}
