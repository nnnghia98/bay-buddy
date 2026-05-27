import "server-only"

import { fetchCustomerDirectory } from "@/lib/server-customers"
import { fetchTickets } from "@/lib/server-tickets"
import { fetchTransactions } from "@/lib/server-transactions"
import type { CustomerDirectoryItem, TicketRead, TransactionRead } from "@/schemas"

export type TicketInputActivityRow = {
  id: string
  added_at: string
  customer: CustomerDirectoryItem | null
  ticket: TicketRead
  transaction: TransactionRead | null
}

export type TicketInputActivityRange = {
  from?: string
  to?: string
}

function parseRangeDate(value: string | undefined): Date | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function getActivityDate(row: TicketInputActivityRow): Date {
  return row.transaction?.created_at ?? row.ticket.created_at
}

function isWithinRange(
  row: TicketInputActivityRow,
  range: TicketInputActivityRange,
): boolean {
  const fromDate = parseRangeDate(range.from)
  const toDate = parseRangeDate(range.to)
  const activityDate = getActivityDate(row)

  if (fromDate && activityDate < fromDate) {
    return false
  }

  if (toDate && activityDate > toDate) {
    return false
  }

  return true
}

export async function fetchTicketInputActivityRows(
  range: TicketInputActivityRange = {},
): Promise<TicketInputActivityRow[]> {
  const [tickets, transactions, customers] = await Promise.all([
    fetchTickets(500),
    fetchTransactions(500),
    fetchCustomerDirectory(500),
  ])

  const customersById = new Map(customers.map((customer) => [customer.id, customer]))
  const purchaseTransactionsByTicketId = new Map<string, TransactionRead>()

  for (const transaction of transactions) {
    if (
      transaction.category === "TICKET_PURCHASE" &&
      transaction.linked_ticket_id
    ) {
      purchaseTransactionsByTicketId.set(transaction.linked_ticket_id, transaction)
    }
  }

  return tickets
    .map((ticket) => {
      const transaction = purchaseTransactionsByTicketId.get(ticket.id) ?? null
      return {
        id: `${ticket.id}:${transaction?.id ?? "missing-transaction"}`,
        added_at: (transaction?.created_at ?? ticket.created_at).toISOString(),
        customer: customersById.get(ticket.customer_id) ?? null,
        ticket,
        transaction,
      }
    })
    .filter((row) => isWithinRange(row, range))
    .sort((first, second) => second.added_at.localeCompare(first.added_at))
}
