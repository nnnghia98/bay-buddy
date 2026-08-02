import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  Panel,
  PanelHeaderRow,
} from "@/components/command-center"
import { CustomerLedgerClient } from "@/components/customer-ledger-client"
import { Button } from "@/components/ui/button"
import {
  AUTH_TOKEN_COOKIE_KEY,
  LOGIN_PATH,
  SESSION_EXPIRED_LOGIN_PATH,
} from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { fetchCurrentUser } from "@/lib/server-users"
import { getI18n } from "@/locales/server"
import { CustomerLedgerSchema, type CustomerLedger } from "@/schemas"
import patterns from "@/styles/ui-patterns.module.css"

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
    redirect(LOGIN_PATH)
  }

  const response = await fetch(buildUrl(`/customers/${customerId}/ledger`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (response.status === 401) {
    redirect(SESSION_EXPIRED_LOGIN_PATH)
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
  const [t, ledger, currentUser] = await Promise.all([
    getI18n(),
    fetchCustomerLedger(customerId),
    fetchCurrentUser(),
  ])

  return (
    <div className={patterns.sectionStack}>
      <div>
        <Button href="/customers" variant="outline">
          {t("customers.ledger.back")}
        </Button>
      </div>

      <CustomerLedgerClient
        currentUserRole={currentUser.role}
        customerId={customerId}
        initialLedger={ledger}
      />

      <Panel>
        <PanelHeaderRow
          title={t("customers.ledger.invoices.title")}
          description={t("customers.ledger.invoices.description")}
          action={
            <Button href={`/invoices?customer_id=${encodeURIComponent(customerId)}`}>
              {t("customers.ledger.invoices.open")}
            </Button>
          }
        />
      </Panel>
    </div>
  )
}
