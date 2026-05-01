import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"

import {
  CommandPanel,
  CommandPanelHeader,
} from "@/components/command-center"
import { CustomerLedgerClient } from "@/components/customer-ledger-client"
import { Button } from "@/components/ui/button"
import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { getI18n } from "@/locales/server"
import { CustomerLedgerSchema, type CustomerLedger } from "@/schemas"

const API_BASE_URL = getServerApiBaseUrl()

type PageProps = {
  params: Promise<{ id: string }>
}

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: string | null
}

function buildUrl(path: string): string {
  return buildApiUrl(path, API_BASE_URL)
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
  const { id: customerId } = await params
  const t = await getI18n()
  const ledger = await fetchCustomerLedger(customerId)

  return (
    <div className="space-y-4">
      <div className="flex justify-start">
        <Button asChild variant="outline">
          <Link href="/customers">{t("customers.ledger.back")}</Link>
        </Button>
      </div>

      <CustomerLedgerClient customerId={customerId} initialLedger={ledger} />

      <CommandPanel>
        <CommandPanelHeader
          title={t("customers.ledger.invoices.title")}
          description={t("customers.ledger.invoices.description")}
          action={
            <Button asChild>
              <Link href={`/invoices?customer_id=${encodeURIComponent(customerId)}`}>
                {t("customers.ledger.invoices.open")}
              </Link>
            </Button>
          }
        />
      </CommandPanel>
    </div>
  )
}
