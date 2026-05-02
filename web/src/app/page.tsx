import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { FinancialSummaryDashboard } from "@/components/financial-summary-dashboard"
import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
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

async function loadFinancialSummarySnapshot() {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value

  if (!token) {
    redirect("/login")
  }

  try {
    const [customers, tickets, transactions] = await Promise.all([
      fetchCollection("/customers/?limit=1000", token, customerDirectorySchema),
      fetchCollection("/tickets/?limit=1000", token, ticketListSchema),
      fetchCollection("/transactions/?limit=5000", token, transactionListSchema),
    ])

    return buildFinancialSummarySnapshot({
      customers,
      tickets,
      transactions,
    })
  } catch {
    return null
  }
}

export default async function Home() {
  const summary = await loadFinancialSummarySnapshot()

  return <FinancialSummaryDashboard summary={summary} />
}
