import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { FinancialSummaryDashboard } from "@/components/financial-summary-dashboard"
import {
  AUTH_TOKEN_COOKIE_KEY,
  LOGIN_PATH,
  SESSION_EXPIRED_LOGIN_PATH,
} from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { buildFinancialSummarySnapshot } from "@/lib/dashboard"
import { CustomerDirectoryItemSchema } from "@/schemas/customer"
import { TicketReadSchema } from "@/schemas/ticket"
import { TransactionReadSchema } from "@/schemas/transaction"

const API_BASE_URL = getServerApiBaseUrl()

const customerDirectorySchema = z.array(CustomerDirectoryItemSchema)
const ticketListSchema = z.array(TicketReadSchema)
const transactionListSchema = z.array(TransactionReadSchema)

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: string | null
}

class DashboardUnauthorizedError extends Error {
  constructor() {
    super("Dashboard request was unauthorized.")
    this.name = "DashboardUnauthorizedError"
  }
}

function buildUrl(path: string): string {
  return buildApiUrl(path, API_BASE_URL)
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
    throw new DashboardUnauthorizedError()
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

async function loadFinancialSummarySnapshot() {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value

  if (!token) {
    redirect(LOGIN_PATH)
  }

  const [customersResult, ticketsResult, transactionsResult] =
    await Promise.allSettled([
      fetchCollection("/customers?limit=500", token, customerDirectorySchema),
      fetchCollection("/tickets?limit=500", token, ticketListSchema),
      fetchCollection("/transactions?limit=1000", token, transactionListSchema),
    ])

  if (
    [customersResult, ticketsResult, transactionsResult].some(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof DashboardUnauthorizedError,
    )
  ) {
    redirect(SESSION_EXPIRED_LOGIN_PATH)
  }

  const customers =
    customersResult.status === "fulfilled" ? customersResult.value : []
  const tickets = ticketsResult.status === "fulfilled" ? ticketsResult.value : []
  const transactions =
    transactionsResult.status === "fulfilled" ? transactionsResult.value : []

  if (customersResult.status === "rejected") {
    console.error("[dashboard] customers collection failed", customersResult.reason)
  }
  if (ticketsResult.status === "rejected") {
    console.error("[dashboard] tickets collection failed", ticketsResult.reason)
  }
  if (transactionsResult.status === "rejected") {
    console.error(
      "[dashboard] transactions collection failed",
      transactionsResult.reason,
    )
  }

  if (
    customersResult.status === "rejected" &&
    ticketsResult.status === "rejected" &&
    transactionsResult.status === "rejected"
  ) {
    console.error("[dashboard] Failed to load financial summary snapshot", {
      customers: customersResult.reason,
      tickets: ticketsResult.reason,
      transactions: transactionsResult.reason,
    })
    return null
  }

  return buildFinancialSummarySnapshot({
    customers,
    tickets,
    transactions,
  })
}

export default async function Home() {
  const summary = await loadFinancialSummarySnapshot()

  return <FinancialSummaryDashboard summary={summary} />
}
