"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { getI18n } from "@/locales/server"
import {
  RecordPaymentActionState,
  TransactionReadSchema,
  initialRecordPaymentActionState,
} from "@/schemas"
import { computeTrueIncome } from "@/schemas/ticket"
import {
  createRecordPaymentFormSchema,
  getRecordPaymentValidationMessages,
} from "@/schemas/finance"

const API_BASE_URL = getServerApiBaseUrl()

type RecordPaymentApiResponse = {
  transaction: unknown
  customer_new_balance: number
  balance_state: "debt" | "settled" | "credit"
}

const recordPaymentApiResponseSchema = z.object({
  transaction: TransactionReadSchema,
  customer_new_balance: z.number(),
  balance_state: z.enum(["debt", "settled", "credit"]),
})

export type LedgerCorrectionActionState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors: Record<string, string | undefined>
  submittedAt?: number
}

const initialLedgerCorrectionActionState: LedgerCorrectionActionState = {
  status: "idle",
  fieldErrors: {},
}

const optionalText = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length > 0 ? value : undefined))

const moneyInput = z.coerce.number().min(0)

const ticketCorrectionSchema = z.object({
  customer_id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  pnr: z.string().trim().length(6).transform((value) => value.toUpperCase()),
  airline: z.enum(["VNA", "VJ", "QH", "VU"]),
  ticket_number: optionalText,
  passengers: z
    .string()
    .transform((value) =>
      value
        .split(/\r?\n|,/)
        .map((passenger) => passenger.trim().toUpperCase())
        .filter(Boolean),
    )
    .refine((value) => value.length > 0, "At least one passenger is required."),
  departure_place: optionalText,
  arrival_place: optionalText,
  departure_code: optionalText.transform((value) => value?.toUpperCase()),
  arrival_code: optionalText.transform((value) => value?.toUpperCase()),
  flight_date: z.coerce.date(),
  net_price: moneyInput,
  ev_price: moneyInput,
  ast_price: moneyInput,
  thf_price: moneyInput,
  web_price: moneyInput,
  selling_price: moneyInput,
  discount: moneyInput,
})

const transactionCategoryToType = {
  TICKET_PURCHASE: "CHARGE",
  PAYMENT: "PAYMENT",
  DISCOUNT: "PAYMENT",
  ADDITIONAL_FEE: "CHARGE",
  REFUND: "REFUND",
} as const

const transactionCorrectionSchema = z.object({
  customer_id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  category: z.enum([
    "TICKET_PURCHASE",
    "PAYMENT",
    "DISCOUNT",
    "ADDITIONAL_FEE",
    "REFUND",
  ]),
  method: z.string().trim().min(1).max(100),
  note: z.string().trim().min(1).max(2000),
  evidence_url: optionalText,
  occurred_at: z.coerce.date(),
})

const deleteLedgerRecordSchema = z.object({
  customer_id: z.string().uuid(),
  record_id: z.string().uuid(),
  record_type: z.enum(["ticket", "transaction"]),
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

export async function recordPaymentAction(
  previousState: RecordPaymentActionState = initialRecordPaymentActionState,
  formData: FormData,
): Promise<RecordPaymentActionState> {
  void previousState
  const t = await getI18n()
  const recordPaymentFormSchema = createRecordPaymentFormSchema(
    getRecordPaymentValidationMessages(t),
  )

  const parsedInput = recordPaymentFormSchema.safeParse({
    customer_id: formData.get("customer_id"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    note: formData.get("note"),
    evidence_url: formData.get("evidence_url"),
    linked_ticket_id: formData.get("linked_ticket_id"),
  })

  if (!parsedInput.success) {
    const flattenedErrors = parsedInput.error.flatten().fieldErrors

    return {
      status: "error",
      message: t("customers.actions.recordPayment.invalidInput"),
      fieldErrors: {
        customer_id: flattenedErrors.customer_id?.[0],
        amount: flattenedErrors.amount?.[0],
        method: flattenedErrors.method?.[0],
        note: flattenedErrors.note?.[0],
        evidence_url: flattenedErrors.evidence_url?.[0],
        linked_ticket_id: flattenedErrors.linked_ticket_id?.[0],
      },
      submittedAt: Date.now(),
      transactionId: null,
    }
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return {
      status: "error",
      message: t("customers.actions.recordPayment.missingAuth"),
      fieldErrors: {},
      submittedAt: Date.now(),
      transactionId: null,
    }
  }

  const { customer_id, ...payload } = parsedInput.data

  const response = await fetch(buildUrl(`/customers/${customer_id}/payments`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const rawText = await response.text()
  let rawPayload: unknown = null

  if (rawText) {
    try {
      rawPayload = JSON.parse(rawText)
    } catch {
      rawPayload = rawText
    }
  }

  if (!response.ok) {
    return {
      status: "error",
      message: getErrorMessage(
        rawPayload,
        t("customers.actions.recordPayment.failure"),
      ),
      fieldErrors: {},
      submittedAt: Date.now(),
      transactionId: null,
    }
  }

  const apiEnvelope =
    rawPayload &&
    typeof rawPayload === "object" &&
    "data" in rawPayload
      ? (rawPayload as { data: RecordPaymentApiResponse }).data
      : (rawPayload as RecordPaymentApiResponse)

  const apiResponseResult = recordPaymentApiResponseSchema.safeParse(apiEnvelope)

  if (!apiResponseResult.success) {
    return {
      status: "error",
      message: t("customers.actions.recordPayment.failure"),
      fieldErrors: {},
      submittedAt: Date.now(),
      transactionId: null,
    }
  }

  revalidatePath(`/customers/${customer_id}`)
  revalidatePath("/report")

  return {
    status: "success",
    message: t("customers.actions.recordPayment.success"),
    fieldErrors: {},
    submittedAt: Date.now(),
    transactionId: apiResponseResult.data.transaction.id,
  }
}

export async function updateTicketLedgerRecordAction(
  previousState: LedgerCorrectionActionState = initialLedgerCorrectionActionState,
  formData: FormData,
): Promise<LedgerCorrectionActionState> {
  void previousState
  const t = await getI18n()
  const parsedInput = ticketCorrectionSchema.safeParse({
    customer_id: formData.get("customer_id"),
    ticket_id: formData.get("ticket_id"),
    pnr: formData.get("pnr"),
    airline: formData.get("airline"),
    ticket_number: formData.get("ticket_number"),
    passengers: formData.get("passengers"),
    departure_place: formData.get("departure_place"),
    arrival_place: formData.get("arrival_place"),
    departure_code: formData.get("departure_code"),
    arrival_code: formData.get("arrival_code"),
    flight_date: formData.get("flight_date"),
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
      message: t("customers.ledger.corrections.invalidInput"),
      fieldErrors: Object.fromEntries(
        Object.entries(parsedInput.error.flatten().fieldErrors).map(([key, value]) => [
          key,
          value?.[0],
        ]),
      ),
      submittedAt: Date.now(),
    }
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return {
      status: "error",
      message: t("customers.actions.recordPayment.missingAuth"),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  const { customer_id, ticket_id, ...values } = parsedInput.data
  const payload = {
    ...values,
    itinerary:
      values.departure_code && values.arrival_code
        ? `${values.departure_code}-${values.arrival_code}`
        : undefined,
    true_income: computeTrueIncome(
      values.selling_price,
      values.discount,
      values.ev_price,
      values.ast_price,
      values.thf_price,
      values.web_price,
    ),
  }

  const response = await fetch(buildUrl(`/tickets/${ticket_id}/correction`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const rawPayload = await parseApiPayload(response)
  if (!response.ok) {
    return {
      status: "error",
      message: getErrorMessage(rawPayload, t("customers.ledger.corrections.failure")),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  revalidatePath(`/customers/${customer_id}`)
  revalidatePath(`/tickets/${ticket_id}`)
  revalidatePath("/report")

  return {
    status: "success",
    message: t("customers.ledger.corrections.updateSuccess"),
    fieldErrors: {},
    submittedAt: Date.now(),
  }
}

export async function updateTransactionLedgerRecordAction(
  previousState: LedgerCorrectionActionState = initialLedgerCorrectionActionState,
  formData: FormData,
): Promise<LedgerCorrectionActionState> {
  void previousState
  const t = await getI18n()
  const parsedInput = transactionCorrectionSchema.safeParse({
    customer_id: formData.get("customer_id"),
    transaction_id: formData.get("transaction_id"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    method: formData.get("method"),
    note: formData.get("note"),
    evidence_url: formData.get("evidence_url"),
    occurred_at: formData.get("occurred_at"),
  })

  if (!parsedInput.success) {
    return {
      status: "error",
      message: t("customers.ledger.corrections.invalidInput"),
      fieldErrors: Object.fromEntries(
        Object.entries(parsedInput.error.flatten().fieldErrors).map(([key, value]) => [
          key,
          value?.[0],
        ]),
      ),
      submittedAt: Date.now(),
    }
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return {
      status: "error",
      message: t("customers.actions.recordPayment.missingAuth"),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  const { customer_id, transaction_id, category, ...values } = parsedInput.data
  const response = await fetch(buildUrl(`/transactions/${transaction_id}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...values,
      category,
      type: transactionCategoryToType[category],
    }),
    cache: "no-store",
  })

  const rawPayload = await parseApiPayload(response)
  if (!response.ok) {
    return {
      status: "error",
      message: getErrorMessage(rawPayload, t("customers.ledger.corrections.failure")),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  revalidatePath(`/customers/${customer_id}`)
  revalidatePath("/report")

  return {
    status: "success",
    message: t("customers.ledger.corrections.updateSuccess"),
    fieldErrors: {},
    submittedAt: Date.now(),
  }
}

export async function deleteLedgerRecordAction(
  previousState: LedgerCorrectionActionState = initialLedgerCorrectionActionState,
  formData: FormData,
): Promise<LedgerCorrectionActionState> {
  void previousState
  const t = await getI18n()
  const parsedInput = deleteLedgerRecordSchema.safeParse({
    customer_id: formData.get("customer_id"),
    record_id: formData.get("record_id"),
    record_type: formData.get("record_type"),
  })

  if (!parsedInput.success) {
    return {
      status: "error",
      message: t("customers.ledger.corrections.invalidInput"),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return {
      status: "error",
      message: t("customers.actions.recordPayment.missingAuth"),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  const { customer_id, record_id, record_type } = parsedInput.data
  const path =
    record_type === "ticket"
      ? `/tickets/${record_id}/correction`
      : `/transactions/${record_id}`
  const response = await fetch(buildUrl(path), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  const rawPayload = await parseApiPayload(response)
  if (!response.ok) {
    return {
      status: "error",
      message: getErrorMessage(rawPayload, t("customers.ledger.corrections.failure")),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  revalidatePath(`/customers/${customer_id}`)
  revalidatePath(record_type === "ticket" ? `/tickets/${record_id}` : "/report")
  revalidatePath("/report")

  return {
    status: "success",
    message: t("customers.ledger.corrections.deleteSuccess"),
    fieldErrors: {},
    submittedAt: Date.now(),
  }
}
