"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { parseCurrencyInput } from "@/lib/formatters"
import { createManualDebtFromFormData } from "@/lib/server-manual-debt"
import { computeTrueIncome } from "@/schemas/ticket"
import {
  initialManualDebtActionState,
  type ManualDebtActionState,
} from "@/schemas"

const API_BASE_URL = getServerApiBaseUrl()

const amountFromForm = z.preprocess(
  (value) => parseCurrencyInput(String(value ?? "")),
  z.number().min(0),
)

const manualDebtRowUpdateSchema = z.object({
  customer_id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  booked_at: z.coerce.date().nullable(),
  selling_price: amountFromForm,
  discount: amountFromForm,
  ev_price: amountFromForm,
  ast_price: amountFromForm,
  thf_price: amountFromForm,
  web_price: amountFromForm,
})

const manualDebtRowDeleteSchema = z.object({
  customer_id: z.string().uuid(),
  ticket_id: z.string().uuid(),
})

function buildUrl(path: string): string {
  return buildApiUrl(path, API_BASE_URL)
}

export async function createManualDebtAction(
  previousState: ManualDebtActionState = initialManualDebtActionState,
  formData: FormData,
): Promise<ManualDebtActionState> {
  void previousState
  return createManualDebtFromFormData(formData)
}

export async function updateManualDebtRowAction(formData: FormData): Promise<void> {
  const parsedInput = manualDebtRowUpdateSchema.safeParse({
    customer_id: formData.get("customer_id"),
    ticket_id: formData.get("ticket_id"),
    booked_at: formData.get("booked_at") || null,
    selling_price: formData.get("selling_price"),
    discount: formData.get("discount"),
    ev_price: formData.get("ev_price"),
    ast_price: formData.get("ast_price"),
    thf_price: formData.get("thf_price"),
    web_price: formData.get("web_price"),
  })

  if (!parsedInput.success) {
    return
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return
  }

  const { customer_id, ticket_id, ...values } = parsedInput.data
  const response = await fetch(buildUrl(`/tickets/${ticket_id}/correction`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...values,
      booked_at: values.booked_at ? values.booked_at.toISOString() : null,
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

  if (!response.ok) {
    return
  }

  revalidatePath("/debts/input")
  revalidatePath("/report")
  revalidatePath(`/customers/${customer_id}`)
  revalidatePath(`/tickets/${ticket_id}`)
}

export async function deleteManualDebtRowAction(formData: FormData): Promise<void> {
  const parsedInput = manualDebtRowDeleteSchema.safeParse({
    customer_id: formData.get("customer_id"),
    ticket_id: formData.get("ticket_id"),
  })

  if (!parsedInput.success) {
    return
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return
  }

  const { customer_id, ticket_id } = parsedInput.data
  const response = await fetch(buildUrl(`/tickets/${ticket_id}/correction`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    return
  }

  revalidatePath("/debts/input")
  revalidatePath("/report")
  revalidatePath(`/customers/${customer_id}`)
}
