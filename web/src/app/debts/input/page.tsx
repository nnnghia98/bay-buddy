import { ManualDebtInputClient } from "@/app/debts/input/manual-debt-input-client"
import { fetchCustomerDirectory } from "@/lib/server-customers"
import { fetchLedgerReportRows } from "@/lib/server-report"

export default async function ManualDebtInputPage() {
  const [customers, reportRows] = await Promise.all([
    fetchCustomerDirectory(10_000),
    fetchLedgerReportRows(),
  ])
  const rows = reportRows.filter((row) => row.entry_type === "ticket")

  return <ManualDebtInputClient customers={customers} rows={rows} />
}
