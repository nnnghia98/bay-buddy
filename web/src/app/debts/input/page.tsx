import { ManualDebtInputClient } from "@/app/debts/input/manual-debt-input-client"
import { fetchCustomerDirectoryPage } from "@/lib/server-customers"
import { fetchTicketDebtPage } from "@/lib/server-report"

export default async function ManualDebtInputPage() {
  const [customerPage, reportPage] = await Promise.all([
    fetchCustomerDirectoryPage({ page: 1, page_size: 50 }),
    fetchTicketDebtPage({ page: 1, page_size: 50 }),
  ])

  return (
    <ManualDebtInputClient
      customers={customerPage.items}
      initialPage={reportPage}
    />
  )
}
