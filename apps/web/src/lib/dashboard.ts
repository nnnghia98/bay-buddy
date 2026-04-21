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

export type FinancialSummarySnapshot = {
  totalRevenue: number
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

export function buildFinancialSummarySnapshot(input: {
  customers: readonly CustomerDirectoryItem[]
  tickets: readonly TicketRead[]
  transactions: readonly TransactionRead[]
}): FinancialSummarySnapshot {
  const confirmedTickets = input.tickets.filter(
    (ticket) => ticket.status === "CONFIRMED",
  )
  const totalRevenue = confirmedTickets.reduce(
    (sum, ticket) => sum + ticket.selling_price,
    0,
  )
  const totalNetProfit = confirmedTickets.reduce(
    (sum, ticket) => sum + ticket.service_fee,
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
    updatedAt: new Date().toISOString(),
  }
}
