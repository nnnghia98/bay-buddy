import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import {
  CustomerInvoiceListSchema,
  InvoiceDetailSchema,
  InvoicePublicViewSchema,
  QuoteDetailSchema,
  type CustomerInvoiceList,
  type InvoiceDetail,
  type InvoicePublicView,
  type QuoteDetail,
} from "@/schemas"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: string | null
}

const API_BASE_URL = getServerApiBaseUrl()

function buildFinanceUrl(path: string): string {
  return buildApiUrl(path, API_BASE_URL)
}

function getEnvelopeData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    const envelope = payload as ApiEnvelope<T>

    if (!envelope.success) {
      throw new Error(envelope.error ?? "Unable to load finance data.")
    }

    return envelope.data
  }

  return payload as T
}

async function fetchAuthenticatedFinancePayload(path: string): Promise<unknown> {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value

  if (!token) {
    redirect("/login")
  }

  const response = await fetch(buildFinanceUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (response.status === 401) {
    redirect("/login")
  }

  const rawPayload = (await response.json()) as unknown

  if (!response.ok) {
    const message =
      rawPayload &&
      typeof rawPayload === "object" &&
      "error" in rawPayload &&
      typeof (rawPayload as { error?: unknown }).error === "string"
        ? (rawPayload as { error: string }).error
        : `Unable to load finance data from ${path}.`

    throw new Error(message)
  }

  return rawPayload
}

export async function fetchCustomerInvoices(
  customerId: string,
): Promise<CustomerInvoiceList> {
  const payload = await fetchAuthenticatedFinancePayload(
    `/finance/invoices?customer_id=${encodeURIComponent(customerId)}`,
  )

  return CustomerInvoiceListSchema.parse(getEnvelopeData(payload))
}

export async function fetchInvoiceDetail(
  invoiceId: string,
): Promise<InvoiceDetail> {
  const payload = await fetchAuthenticatedFinancePayload(
    `/finance/invoices/${encodeURIComponent(invoiceId)}`,
  )

  return InvoiceDetailSchema.parse(getEnvelopeData(payload))
}

export async function fetchInvoicePublicView(
  invoiceId: string,
): Promise<InvoicePublicView> {
  const payload = await fetchAuthenticatedFinancePayload(
    `/finance/invoices/${encodeURIComponent(invoiceId)}/public`,
  )

  return InvoicePublicViewSchema.parse(getEnvelopeData(payload))
}

export async function fetchQuoteDetail(quoteId: string): Promise<QuoteDetail> {
  const payload = await fetchAuthenticatedFinancePayload(
    `/finance/quotes/${encodeURIComponent(quoteId)}`,
  )

  return QuoteDetailSchema.parse(getEnvelopeData(payload))
}
