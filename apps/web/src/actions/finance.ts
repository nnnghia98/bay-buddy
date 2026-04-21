"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import {
  RecordPaymentActionState,
  TransactionReadSchema,
  initialRecordPaymentActionState,
  recordPaymentFormSchema,
} from "@/schemas"

const API_BASE_URL = getServerApiBaseUrl()

type RecordPaymentApiResponse = {
  transaction: unknown
  customer_new_balance: number
  balance_state: "debt" | "settled" | "credit"
}

function buildUrl(path: string): string {
  return buildApiUrl(path, API_BASE_URL)
}

function getErrorMessage(payload: unknown): string {
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

  return "Không thể ghi nhận thanh toán lúc này."
}

export async function recordPaymentAction(
  previousState: RecordPaymentActionState = initialRecordPaymentActionState,
  formData: FormData,
): Promise<RecordPaymentActionState> {
  void previousState

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
      message: "Vui lòng kiểm tra lại thông tin thanh toán.",
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
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
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
      message: getErrorMessage(rawPayload),
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

  revalidatePath(`/customers/${customer_id}`)

  const transactionResult = TransactionReadSchema.safeParse(apiEnvelope.transaction)

  return {
    status: "success",
    message: "Đã ghi nhận thanh toán thành công.",
    fieldErrors: {},
    submittedAt: Date.now(),
    transactionId: transactionResult.success ? transactionResult.data.id : null,
  }
}
