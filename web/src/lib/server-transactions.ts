import "server-only"

import { z } from "zod"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import { TransactionReadSchema, type TransactionRead } from "@/schemas"

const transactionListSchema = z.array(TransactionReadSchema)

export async function fetchTransactions(limit = 500): Promise<TransactionRead[]> {
  const payload = await fetchAuthenticatedApiPayload(
    `/transactions?limit=${limit}`,
    "Unable to load transactions.",
  )

  return transactionListSchema.parse(getEnvelopeData(payload))
}
