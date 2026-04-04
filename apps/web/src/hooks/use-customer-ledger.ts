"use client"

import { useQuery } from "@tanstack/react-query"

import { apiFetchData } from "@/lib/api"
import { CustomerLedgerSchema, type CustomerLedger } from "@/schemas"

async function fetchCustomerLedger(customerId: string): Promise<CustomerLedger> {
  const payload = await apiFetchData<unknown>(`/customers/${customerId}/ledger`)
  return CustomerLedgerSchema.parse(payload)
}

export function useCustomerLedger(customerId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["customer-ledger", customerId],
    queryFn: () => fetchCustomerLedger(customerId!),
    enabled: enabled && Boolean(customerId),
  })
}
