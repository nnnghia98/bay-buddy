import type { CustomerDirectoryItem, TicketRead, TransactionRead } from "@/schemas"

const REVENUE_WINDOW_DAYS = 30
const REVENUE_TRANSACTION_CATEGORIES = new Set<
  TransactionRead["category"]
>(["TICKET_PURCHASE", "ADDITIONAL_FEE"])
const DASHBOARD_TIME_ZONE = "Asia/Ho_Chi_Minh"
const dashboardDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DASHBOARD_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

function getTicketActivityTitle(ticket: TicketRead): string {
  const ticketLabel = ticket.pnr ?? ticket.ticket_number ?? ticket.id.slice(0, 8)
  return ticket.itinerary ? `${ticketLabel} - ${ticket.itinerary}` : ticketLabel
}

export type RevenueTrendPoint = {
  date: string
  label: string
  revenue: number
  cumulativeRevenue: number
}

export type TopDebtor = {
  id: string
  name: string
  outstandingBalance: number
  status: "high" | "medium"
}

export type DashboardActionQueue = {
  key: "receivables" | "heldCredit" | "draftTickets"
  count: number
  amount: number
  href: string
  severity: "high" | "medium" | "low"
}

export type DashboardRecentActivity = {
  id: string
  type: "ticket" | "payment" | "adjustment" | "refund"
  category?: TransactionRead["category"]
  title: string
  amount: number
  createdAt: Date
  href: string
}

export type FinancialSummarySnapshot = {
  totalRevenue: number
  revenueFromDate: string
  totalNetProfit: number
  totalReceivables: number
  totalHeldCredit: number
  confirmedTickets: number
  activeCustomers: number
  customersWithDebt: number
  customersWithCredit: number
  averageMarginPercent: number
  receivablesRatioPercent: number
  revenueTrend: RevenueTrendPoint[]
  topDebtors: TopDebtor[]
  actionQueues: DashboardActionQueue[]
  recentActivity: DashboardRecentActivity[]
  updatedAt: string
}

function getDateParts(value: Date): { year: string; month: string; day: string } {
  const parts = dashboardDateFormatter.formatToParts(value)

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "0000",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  }
}

function getDateKey(value: Date): string {
  const { year, month, day } = getDateParts(value)

  return `${year}-${month}-${day}`
}

function getDateLabel(value: Date): string {
  const { month, day } = getDateParts(value)

  return `${day}/${month}`
}

function buildRevenueTrend(
  transactions: readonly TransactionRead[],
): RevenueTrendPoint[] {
  const dailyRevenue = new Map<string, number>()
  const dates: Array<{ date: string; label: string }> = []
  const today = new Date()

  for (let dayOffset = REVENUE_WINDOW_DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - dayOffset)

    dates.push({
      date: getDateKey(date),
      label: getDateLabel(date),
    })
  }

  const dateKeys = new Set(dates.map((point) => point.date))

  for (const transaction of transactions) {
    if (!REVENUE_TRANSACTION_CATEGORIES.has(transaction.category)) {
      continue
    }

    const dateKey = getDateKey(transaction.created_at)

    if (!dateKeys.has(dateKey)) {
      continue
    }

    dailyRevenue.set(
      dateKey,
      (dailyRevenue.get(dateKey) ?? 0) + transaction.amount,
    )
  }

  let cumulativeRevenue = 0

  return dates.map((point) => {
    const revenue = dailyRevenue.get(point.date) ?? 0
    cumulativeRevenue += revenue

    return {
      date: point.date,
      label: point.label,
      revenue,
      cumulativeRevenue,
    }
  })
}

function buildTopDebtors(
  customers: readonly CustomerDirectoryItem[],
): TopDebtor[] {
  return customers
    .filter((customer) => customer.current_balance > 0)
    .toSorted((left, right) => right.current_balance - left.current_balance)
    .slice(0, 5)
    .map((customer) => ({
      id: customer.id,
      name: customer.full_name,
      outstandingBalance: customer.current_balance,
      status: customer.current_balance > 10_000_000 ? "high" : "medium",
    }))
}

function getQueueSeverity(amount: number): DashboardActionQueue["severity"] {
  if (amount >= 10_000_000) {
    return "high"
  }

  if (amount > 0) {
    return "medium"
  }

  return "low"
}

function buildActionQueues(input: {
  customers: readonly CustomerDirectoryItem[]
  tickets: readonly TicketRead[]
}): DashboardActionQueue[] {
  const receivableCustomers = input.customers.filter(
    (customer) => customer.current_balance > 0,
  )
  const creditCustomers = input.customers.filter(
    (customer) => customer.current_balance < 0,
  )
  const draftTickets = input.tickets.filter((ticket) => ticket.status === "DRAFT")
  const totalReceivables = receivableCustomers.reduce(
    (sum, customer) => sum + customer.current_balance,
    0,
  )
  const totalHeldCredit = creditCustomers.reduce(
    (sum, customer) => sum + Math.abs(customer.current_balance),
    0,
  )
  const draftTicketAmount = draftTickets.reduce(
    (sum, ticket) => sum + ticket.selling_price,
    0,
  )

  return [
    {
      key: "receivables",
      count: receivableCustomers.length,
      amount: totalReceivables,
      href: "/customers",
      severity: getQueueSeverity(totalReceivables),
    },
    {
      key: "heldCredit",
      count: creditCustomers.length,
      amount: totalHeldCredit,
      href: "/customers",
      severity: getQueueSeverity(totalHeldCredit),
    },
    {
      key: "draftTickets",
      count: draftTickets.length,
      amount: draftTicketAmount,
      href: "/tickets/input",
      severity: getQueueSeverity(draftTicketAmount),
    },
  ]
}

function getTransactionActivityAmount(transaction: TransactionRead): number {
  if (
    transaction.category === "PAYMENT" ||
    transaction.category === "DISCOUNT"
  ) {
    return -transaction.amount
  }

  return transaction.amount
}

function getTransactionActivityType(
  transaction: TransactionRead,
): DashboardRecentActivity["type"] {
  if (transaction.category === "REFUND") {
    return "refund"
  }

  if (transaction.category === "PAYMENT") {
    return "payment"
  }

  if (
    transaction.category === "DISCOUNT" ||
    transaction.category === "ADDITIONAL_FEE"
  ) {
    return "adjustment"
  }

  return "ticket"
}

function buildRecentActivity(input: {
  tickets: readonly TicketRead[]
  transactions: readonly TransactionRead[]
}): DashboardRecentActivity[] {
  const ticketPurchaseTimestampByTicketId = new Map<string, Date>()

  for (const transaction of input.transactions) {
    if (
      transaction.category !== "TICKET_PURCHASE" ||
      !transaction.linked_ticket_id
    ) {
      continue
    }

    const existingTimestamp = ticketPurchaseTimestampByTicketId.get(
      transaction.linked_ticket_id,
    )

    if (!existingTimestamp || existingTimestamp < transaction.created_at) {
      ticketPurchaseTimestampByTicketId.set(
        transaction.linked_ticket_id,
        transaction.created_at,
      )
    }
  }

  const ticketActivity: DashboardRecentActivity[] = input.tickets
    .filter((ticket) => ticket.status === "CONFIRMED")
    .map((ticket) => {
      const purchaseTimestamp = ticketPurchaseTimestampByTicketId.get(ticket.id)
      const activityTimestamp =
        purchaseTimestamp && purchaseTimestamp > ticket.updated_at
          ? purchaseTimestamp
          : ticket.updated_at

      return {
        id: ticket.id,
        type: "ticket",
        title: getTicketActivityTitle(ticket),
        amount: ticket.selling_price,
        createdAt: activityTimestamp,
        href: `/customers/${ticket.customer_id}`,
      }
    })
  const transactionActivity: DashboardRecentActivity[] = input.transactions.map(
    (transaction) => ({
      id: transaction.id,
      type: getTransactionActivityType(transaction),
      category: transaction.category,
      title: transaction.note?.trim() ?? "",
      amount: getTransactionActivityAmount(transaction),
      createdAt: transaction.created_at,
      href: `/customers/${transaction.customer_id}`,
    }),
  )

  return [...ticketActivity, ...transactionActivity]
    .toSorted((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 8)
}

export function buildFinancialSummarySnapshot(input: {
  customers: readonly CustomerDirectoryItem[]
  tickets: readonly TicketRead[]
  transactions: readonly TransactionRead[]
  revenueFrom?: Date
}): FinancialSummarySnapshot {
  const revenueFromDateKey = input.revenueFrom
    ? getDateKey(input.revenueFrom)
    : null
  const confirmedTickets = input.tickets.filter(
    (ticket) => ticket.status === "CONFIRMED",
  )
  const totalRevenue = input.transactions.reduce(
    (sum, transaction) => {
      if (!REVENUE_TRANSACTION_CATEGORIES.has(transaction.category)) {
        return sum
      }

      const transactionDateKey = getDateKey(transaction.created_at)
      if (revenueFromDateKey && transactionDateKey < revenueFromDateKey) {
        return sum
      }

      return sum + transaction.amount
    },
    0,
  )
  const totalNetProfit = confirmedTickets.reduce(
    (sum, ticket) => sum + ticket.true_income,
    0,
  )
  const totalReceivables = input.customers.reduce((sum, customer) => {
    return customer.current_balance > 0
      ? sum + customer.current_balance
      : sum
  }, 0)
  const totalHeldCredit = input.customers.reduce((sum, customer) => {
    return customer.current_balance < 0
      ? sum + Math.abs(customer.current_balance)
      : sum
  }, 0)
  const customersWithDebt = input.customers.filter(
    (customer) => customer.current_balance > 0,
  ).length
  const customersWithCredit = input.customers.filter(
    (customer) => customer.current_balance < 0,
  ).length

  return {
    totalRevenue,
    revenueFromDate: revenueFromDateKey ?? "",
    totalNetProfit,
    totalReceivables,
    totalHeldCredit,
    confirmedTickets: confirmedTickets.length,
    activeCustomers: input.customers.length,
    customersWithDebt,
    customersWithCredit,
    averageMarginPercent:
      totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0,
    receivablesRatioPercent:
      totalRevenue > 0 ? (totalReceivables / totalRevenue) * 100 : 0,
    revenueTrend: buildRevenueTrend(input.transactions),
    topDebtors: buildTopDebtors(input.customers),
    actionQueues: buildActionQueues(input),
    recentActivity: buildRecentActivity(input),
    updatedAt: new Date().toISOString(),
  }
}
