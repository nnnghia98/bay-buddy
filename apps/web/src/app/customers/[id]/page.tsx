import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { CustomerLedgerClient } from "@/components/customer-ledger-client"
import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { CustomerLedgerSchema, type CustomerLedger } from "@/schemas"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6768/api/v1"

type PageProps = {
  params: Promise<{ id: string }> | { id: string }
}

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: string | null
}

function buildUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

async function fetchCustomerLedger(customerId: string): Promise<CustomerLedger | null> {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value

  if (!token) {
    redirect("/login")
  }

  const response = await fetch(buildUrl(`/customers/${customerId}/ledger`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (response.status === 401) {
    redirect("/login")
  }

  if (!response.ok) {
    return null
  }

  const rawPayload = (await response.json()) as
    | ApiEnvelope<unknown>
    | CustomerLedger

  const payload =
    rawPayload &&
    typeof rawPayload === "object" &&
    "success" in rawPayload &&
    "data" in rawPayload
      ? rawPayload.data
      : rawPayload

  return CustomerLedgerSchema.parse(payload)
}

export default async function CustomerLedgerPage({ params }: PageProps) {
  const { id: customerId } = await Promise.resolve(params)
  const ledger = await fetchCustomerLedger(customerId)

  return (
    <CustomerLedgerClient customerId={customerId} initialLedger={ledger} />
  )
}
