import "server-only"

import { z } from "zod"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import {
  CustomerDirectoryItemSchema,
  CustomerLedgerSchema,
  type CustomerDirectoryItem,
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

export async function fetchCustomerLedger(
  customerId: string,
): Promise<CustomerLedger> {
  const payload = await fetchAuthenticatedApiPayload(
    `/customers/${customerId}/ledger`,
    "Unable to load customer ledger.",
  )

  return CustomerLedgerSchema.parse(getEnvelopeData(payload))
}
