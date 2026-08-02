import { ManualDebtInputClient } from "@/app/debts/input/manual-debt-input-client"
import { fetchCustomerDirectory } from "@/lib/server-customers"
import { fetchTicketDebtRows } from "@/lib/server-report"

export default async function ManualDebtInputPage() {
  const [customers, reportRows] = await Promise.all([
    fetchCustomerDirectory(10_000),
    fetchTicketDebtRows(),
  ])

  return <ManualDebtInputClient customers={customers} rows={reportRows} />
}
