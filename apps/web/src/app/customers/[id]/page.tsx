import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CustomerLedgerClient } from "@/components/customer-ledger-client"
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
    <div className="space-y-6">
      <section className="mx-auto max-w-7xl rounded-[24px] border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-accent text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium tracking-[-0.02em] text-foreground">
                {t("customers.ledger.invoices.title")}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {t("customers.ledger.invoices.description")}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/invoices?customer_id=${encodeURIComponent(customerId)}`}>
              {t("customers.ledger.invoices.open")}
            </Link>
          </Button>
        </div>
      </section>

      <CustomerLedgerClient customerId={customerId} initialLedger={ledger} />
    </div>
  )
}
