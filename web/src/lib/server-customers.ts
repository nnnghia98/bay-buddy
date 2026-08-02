import "server-only"

import { z } from "zod"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import {
  CustomerDirectoryItemSchema,
  CustomerDirectoryPageSchema,
  CustomerLedgerSchema,
  type CustomerDirectoryItem,
  type CustomerDirectoryPage,
  type CustomerLedger,
} from "@/schemas"

const customerDirectorySchema = z.array(CustomerDirectoryItemSchema)

export async function fetchCustomerDirectory(
  limit = 500,
): Promise<CustomerDirectoryItem[]> {
  const payload = await fetchAuthenticatedApiPayload(
    `/customers?limit=${limit}`,
    "Unable to load customers.",
  )

  return customerDirectorySchema.parse(getEnvelopeData(payload))
}

export type CustomerDirectoryQuery = {
  page?: number
  page_size?: number
  q?: string
}

export async function fetchCustomerDirectoryPage(
  query: CustomerDirectoryQuery = {},
): Promise<CustomerDirectoryPage> {
  const params = new URLSearchParams()
  params.set("page", String(query.page ?? 1))
  params.set("page_size", String(query.page_size ?? 50))
  if (query.q?.trim()) {
    params.set("q", query.q.trim())
  }

  const payload = await fetchAuthenticatedApiPayload(
    `/customers?${params.toString()}`,
    "Unable to load customers.",
  )

  return CustomerDirectoryPageSchema.parse(getEnvelopeData(payload))
}

export async function fetchCustomerLedger(
  customerId: string,
): Promise<CustomerLedger> {
  const payload = await fetchAuthenticatedApiPayload(
    `/customers/${customerId}/ledger`,
    "Unable to load customer ledger.",
  )

  return CustomerLedgerSchema.parse(getEnvelopeData(payload))
}
