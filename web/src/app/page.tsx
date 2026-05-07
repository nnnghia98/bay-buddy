import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { FinancialSummaryDashboard } from "@/components/financial-summary-dashboard"
import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { buildFinancialSummarySnapshot } from "@/lib/dashboard"
import { parseRevenueFromParam } from "@/lib/revenue-cutoff"
import { CustomerDirectoryItemSchema } from "@/schemas/customer"
import { TicketReadSchema } from "@/schemas/ticket"
import { TransactionReadSchema } from "@/schemas/transaction"

const API_BASE_URL = getServerApiBaseUrl()

const customerDirectorySchema = z.array(CustomerDirectoryItemSchema)
const ticketListSchema = z.array(TicketReadSchema)
const transactionListSchema = z.array(TransactionReadSchema)
const REVENUE_FROM_PARAM = "revenue_from"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: string | null
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

async function loadFinancialSummarySnapshot(input?: { revenueFromParam?: string }) {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value

  if (!token) {
    redirect("/login")
  }

  try {
    const [customersResult, ticketsResult, transactionsResult] =
      await Promise.allSettled([
        fetchCollection("/customers?limit=500", token, customerDirectorySchema),
        fetchCollection("/tickets?limit=500", token, ticketListSchema),
        fetchCollection("/transactions?limit=1000", token, transactionListSchema),
      ])

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
      throw new Error("All dashboard collections failed")
    }

    return buildFinancialSummarySnapshot({
      customers,
      tickets,
      transactions,
      revenueFrom: parseRevenueFromParam(input?.revenueFromParam),
    })
  } catch (error) {
    console.error("[dashboard] Failed to load financial summary snapshot", error)
    return null
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = searchParams ? await searchParams : undefined
  const revenueFromRaw = params?.[REVENUE_FROM_PARAM]
  const revenueFromParam = Array.isArray(revenueFromRaw)
    ? revenueFromRaw[0]
    : revenueFromRaw
  const summary = await loadFinancialSummarySnapshot({ revenueFromParam })

  return <FinancialSummaryDashboard summary={summary} />
}
