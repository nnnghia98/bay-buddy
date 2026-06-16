import "server-only"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { getI18n } from "@/locales/server"
import {
  createManualDebtFormSchema,
  getManualDebtValidationMessages,
  type ManualDebtActionState,
} from "@/schemas"
import { computeTrueIncome } from "@/schemas/ticket"

const API_BASE_URL = getServerApiBaseUrl()

const confirmTicketResponseSchema = z.object({
  ticket: z.object({
    id: z.string().uuid(),
  }),
  customer: z.object({
    id: z.string().uuid(),
  }),
})

function buildUrl(path: string): string {
  return buildApiUrl(path, API_BASE_URL)
}

function getErrorMessage(
  payload: unknown,
  fallbackMessage: string,
): string {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof (payload as { detail?: unknown }).detail === "string"
  ) {
    return (payload as { detail: string }).detail
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error
  }

  return fallbackMessage
}

async function parseApiPayload(response: Response): Promise<unknown> {
  const rawText = await response.text()
  if (!rawText) {
    return null
  }

  try {
    return JSON.parse(rawText)
  } catch {
    return rawText
  }
}

export async function createManualDebtFromFormData(
  formData: FormData,
  translate?: (key: string) => string,
): Promise<ManualDebtActionState> {
  const serverT = translate ? null : await getI18n()
  const t = (key: string) => translate?.(key) ?? serverT?.(key as never) ?? key
  const manualDebtFormSchema = createManualDebtFormSchema(
    getManualDebtValidationMessages((key) => t(key)),
  )

  const parsedInput = manualDebtFormSchema.safeParse({
    customer_name: formData.get("customer_name"),
    pnr: formData.get("pnr"),
    airline: formData.get("airline"),
    ticket_number: formData.get("ticket_number"),
    passengers: formData.get("passengers"),
    departure_place: formData.get("departure_place"),
    arrival_place: formData.get("arrival_place"),
    departure_code: formData.get("departure_code"),
    arrival_code: formData.get("arrival_code"),
    route: formData.get("route"),
    flight_date: formData.get("flight_date"),
    booked_at: formData.get("booked_at"),
    net_price: formData.get("net_price"),
    ev_price: formData.get("ev_price"),
    ast_price: formData.get("ast_price"),
    thf_price: formData.get("thf_price"),
    web_price: formData.get("web_price"),
    selling_price: formData.get("selling_price"),
    discount: formData.get("discount"),
  })

  if (!parsedInput.success) {
    return {
      status: "error",
      message: t("manualDebts.actions.invalidInput"),
      fieldErrors: Object.fromEntries(
        Object.entries(parsedInput.error.flatten().fieldErrors).map(
          ([key, value]) => [key, value?.[0]],
        ),
      ),
      submittedAt: Date.now(),
      ticketId: null,
    }
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return {
      status: "error",
      message: t("manualDebts.actions.missingAuth"),
      fieldErrors: {},
      submittedAt: Date.now(),
      ticketId: null,
    }
  }

  const values = parsedInput.data
  const route =
    values.departure_code && values.arrival_code
      ? `${values.departure_code}-${values.arrival_code}`
      : values.route
  const response = await fetch(buildUrl("/tickets/confirm"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      customer_name: values.customer_name,
      pnr: values.pnr,
      airline: values.airline,
      ticket_number: values.ticket_number,
      passengers: values.passengers,
      departure_place: values.departure_place ?? null,
      arrival_place: values.arrival_place ?? null,
      departure_code: values.departure_code ?? null,
      arrival_code: values.arrival_code ?? null,
      itinerary: route,
      flight_date: values.flight_date.toISOString(),
      booked_at: values.booked_at.toISOString(),
      net_price: values.net_price,
      service_fee: values.selling_price - values.net_price,
      ev_price: values.ev_price,
      ast_price: values.ast_price,
      thf_price: values.thf_price,
      web_price: values.web_price,
      selling_price: values.selling_price,
      discount: values.discount,
      true_income: computeTrueIncome(
        values.selling_price,
        values.discount,
        values.ev_price,
        values.ast_price,
        values.thf_price,
        values.web_price,
      ),
    }),
    cache: "no-store",
  })

  const rawPayload = await parseApiPayload(response)

  if (!response.ok) {
    return {
      status: "error",
      message: getErrorMessage(rawPayload, t("manualDebts.actions.failure")),
      fieldErrors: {},
      submittedAt: Date.now(),
      ticketId: null,
    }
  }

  const apiEnvelope =
    rawPayload &&
    typeof rawPayload === "object" &&
    "data" in rawPayload
      ? (rawPayload as { data: unknown }).data
      : rawPayload
  const apiResponseResult = confirmTicketResponseSchema.safeParse(apiEnvelope)

  if (!apiResponseResult.success) {
    return {
      status: "error",
      message: t("manualDebts.actions.failure"),
      fieldErrors: {},
      submittedAt: Date.now(),
      ticketId: null,
    }
  }

  revalidatePath("/debts/input")
  revalidatePath("/report")
  revalidatePath(`/customers/${apiResponseResult.data.customer.id}`)

  return {
    status: "success",
    message: t("manualDebts.actions.success"),
    fieldErrors: {},
    submittedAt: Date.now(),
    ticketId: apiResponseResult.data.ticket.id,
  }
}
