"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { QuoteConvertResponseSchema } from "@/schemas"

const API_BASE_URL = getServerApiBaseUrl()

const quoteConvertFormSchema = z.object({
  quote_id: z.string().uuid("Mã báo giá không hợp lệ."),
})

const quoteConvertApiEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
  error: z.string().nullable(),
})

type QuoteConvertActionState = {
  status: "idle" | "success" | "error"
  message: string | null
  fieldErrors: Partial<Record<"quote_id", string>>
  submittedAt: number | null
  quoteId: string | null
  invoiceId: string | null
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

  return "Không thể chuyển báo giá thành hóa đơn lúc này."
}

function createErrorState(
  message: string,
  quoteId: string | null = null,
  fieldErrors: Partial<Record<"quote_id", string>> = {},
): QuoteConvertActionState {
  return {
    status: "error",
    message,
    fieldErrors,
    submittedAt: Date.now(),
    quoteId,
    invoiceId: null,
  }
}

const initialConvertQuoteToInvoiceActionState: QuoteConvertActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  submittedAt: null,
  quoteId: null,
  invoiceId: null,
}

export async function convertQuoteToInvoiceAction(
  previousState: QuoteConvertActionState = initialConvertQuoteToInvoiceActionState,
  formData: FormData,
): Promise<QuoteConvertActionState> {
  void previousState

  const parsedInput = quoteConvertFormSchema.safeParse({
    quote_id: formData.get("quote_id"),
  })

  if (!parsedInput.success) {
    const flattenedErrors = parsedInput.error.flatten().fieldErrors

    return createErrorState(
      "Vui lòng chọn báo giá cần chuyển.",
      null,
      {
        quote_id: flattenedErrors.quote_id?.[0] ?? "Mã báo giá không hợp lệ.",
      },
    )
  }

  const { quote_id: quoteId } = parsedInput.data
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value

  if (!token) {
    return createErrorState("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", quoteId)
  }

  const response = await fetch(buildUrl(`/finance/quotes/${quoteId}/convert-to-invoice`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({}),
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

  if (response.status === 401) {
    return createErrorState("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", quoteId)
  }

  if (response.status === 403) {
    return createErrorState("Bạn không có quyền chuyển báo giá này thành hóa đơn.", quoteId)
  }

  if (!response.ok) {
    return createErrorState(getErrorMessage(rawPayload), quoteId)
  }

  const envelopeResult = quoteConvertApiEnvelopeSchema.safeParse(rawPayload)

  if (!envelopeResult.success) {
    return createErrorState(
      "Không thể chuyển báo giá thành hóa đơn lúc này.",
      quoteId,
    )
  }

  if (!envelopeResult.data.success) {
    return createErrorState(getErrorMessage(rawPayload), quoteId)
  }

  const payloadResult = QuoteConvertResponseSchema.safeParse(envelopeResult.data.data)

  if (!payloadResult.success) {
    return createErrorState(
      "Không thể chuyển báo giá thành hóa đơn lúc này.",
      quoteId,
    )
  }

  const apiResponse = payloadResult.data
  const invoiceId = apiResponse.invoice.id

  revalidatePath(`/quotes/${quoteId}`)
  revalidatePath(`/invoices/${invoiceId}`)

  return {
    status: "success",
    message: "Đã chuyển báo giá thành hóa đơn.",
    fieldErrors: {},
    submittedAt: Date.now(),
    quoteId,
    invoiceId,
  }
}
