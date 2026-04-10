import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { FinancialSummaryDashboard } from "@/components/financial-summary-dashboard"
import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { CustomerDirectoryItemSchema } from "@/schemas/customer"
import { TicketReadSchema } from "@/schemas/ticket"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6768/api/v1"

const customerDirectorySchema = z.array(CustomerDirectoryItemSchema)
const ticketListSchema = z.array(TicketReadSchema)

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: string | null
}

type FinancialSummarySnapshot = {
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
  updatedAt: string
}

function buildUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

async function fetchCollection<TSchema extends z.ZodTypeAny>(
  path: string,
  token: string,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const response = await fetch(buildUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (response.status === 401) {
    redirect("/login")
  }

  if (!response.ok) {
    throw new Error(`Request failed for ${path}`)
  }

  const rawPayload = (await response.json()) as ApiEnvelope<unknown> | unknown
  const payload =
    rawPayload &&
    typeof rawPayload === "object" &&
    "success" in rawPayload &&
    "data" in rawPayload
      ? rawPayload.data
      : rawPayload

  return schema.parse(payload)
}

function buildFinancialSummarySnapshot(
  customers: z.infer<typeof customerDirectorySchema>,
  tickets: z.infer<typeof ticketListSchema>,
): FinancialSummarySnapshot {
  const confirmedTickets = tickets.filter((ticket) => ticket.status === "CONFIRMED")
  const totalRevenue = confirmedTickets.reduce(
    (sum, ticket) => sum + ticket.selling_price,
    0,
  )
  const totalNetProfit = confirmedTickets.reduce(
    (sum, ticket) => sum + ticket.service_fee,
    0,
  )
  const totalReceivables = customers.reduce((sum, customer) => {
    return customer.current_balance > 0
      ? sum + customer.current_balance
      : sum
  }, 0)
  const totalHeldCredit = customers.reduce((sum, customer) => {
    return customer.current_balance < 0
      ? sum + Math.abs(customer.current_balance)
      : sum
  }, 0)
  const customersWithDebt = customers.filter(
    (customer) => customer.current_balance > 0,
  ).length
  const customersWithCredit = customers.filter(
    (customer) => customer.current_balance < 0,
  ).length

  return {
    totalRevenue,
    totalNetProfit,
    totalReceivables,
    totalHeldCredit,
    confirmedTickets: confirmedTickets.length,
    activeCustomers: customers.length,
    customersWithDebt,
    customersWithCredit,
    averageMarginPercent:
      totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0,
    receivablesRatioPercent:
      totalRevenue > 0 ? (totalReceivables / totalRevenue) * 100 : 0,
    updatedAt: new Date().toISOString(),
  }
}

async function loadFinancialSummarySnapshot(): Promise<FinancialSummarySnapshot | null> {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value

  if (!token) {
    redirect("/login")
  }

  try {
    const [customers, tickets] = await Promise.all([
      fetchCollection("/customers?limit=1000", token, customerDirectorySchema),
      fetchCollection("/tickets?limit=1000", token, ticketListSchema),
    ])

    return buildFinancialSummarySnapshot(customers, tickets)
  } catch {
    return null
  }
}

export default async function Home() {
  const summary = await loadFinancialSummarySnapshot()

  return <FinancialSummaryDashboard summary={summary} />
}
