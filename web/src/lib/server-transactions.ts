import "server-only"

import { z } from "zod"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import {
  TransactionPageSchema,
  TransactionReadSchema,
  type TransactionPage,
  type TransactionRead,
} from "@/schemas"

const transactionListSchema = z.array(TransactionReadSchema)

export async function fetchTransactions(limit = 500): Promise<TransactionRead[]> {
  const payload = await fetchAuthenticatedApiPayload(
    `/transactions?limit=${limit}`,
    "Unable to load transactions.",
  )

  return transactionListSchema.parse(getEnvelopeData(payload))
}

export type TransactionPageQuery = {
  page?: number
  page_size?: number
  q?: string
  category?: string
  from?: string
  to?: string
}

export async function fetchTransactionsPage(
  query: TransactionPageQuery = {},
): Promise<TransactionPage> {
  const params = new URLSearchParams()
  params.set("page", String(query.page ?? 1))
  params.set("page_size", String(query.page_size ?? 50))
  for (const key of ["q", "category", "from", "to"] as const) {
    if (query[key]) {
      params.set(key, query[key] as string)
    }
  }

  const payload = await fetchAuthenticatedApiPayload(
    `/transactions?${params.toString()}`,
    "Unable to load transactions.",
  )

  return TransactionPageSchema.parse(getEnvelopeData(payload))
}
