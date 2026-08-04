"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { createManualDebtFromFormData } from "@/lib/server-manual-debt"
import { getI18n } from "@/locales/server"
import {
  createManualDebtRowUpdateSchema,
  getManualDebtRowUpdateValidationMessages,
  initialManualDebtActionState,
  initialManualDebtRowUpdateActionState,
  type ManualDebtActionState,
  type ManualDebtRowUpdateActionState,
} from "@/schemas"

const API_BASE_URL = getServerApiBaseUrl()

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

export async function updateManualDebtRowAction(
  previousState: ManualDebtRowUpdateActionState = initialManualDebtRowUpdateActionState,
  formData: FormData,
): Promise<ManualDebtRowUpdateActionState> {
  void previousState

  const t = await getI18n()
  const schema = createManualDebtRowUpdateSchema(
    getManualDebtRowUpdateValidationMessages((key) => t(key)),
  )
  const parsedInput = schema.safeParse({
    customer_id: formData.get("customer_id"),
    ticket_id: formData.get("ticket_id"),
    pnr: formData.get("pnr"),
    airline: formData.get("airline"),
    ticket_number: formData.get("ticket_number"),
    passengers: formData.get("passengers"),
    itinerary: formData.get("itinerary"),
    flight_date: formData.get("flight_date"),
    booked_at: formData.get("booked_at") || null,
    net_price: formData.get("net_price"),
    selling_price: formData.get("selling_price"),
    discount: formData.get("discount"),
    ev_price: formData.get("ev_price"),
    ast_price: formData.get("ast_price"),
    thf_price: formData.get("thf_price"),
    web_price: formData.get("web_price"),
    insurance_price: formData.get("insurance_price"),
    true_income: formData.get("true_income"),
    true_income_override: formData.get("true_income_override"),
    payment_method: formData.get("payment_method"),
    payment_method_changed: formData.get("payment_method_changed"),
    payment_amount: formData.get("payment_amount"),
    payment_amount_changed: formData.get("payment_amount_changed"),
    payment_occurred_at: formData.get("payment_occurred_at"),
    payment_occurred_at_changed: formData.get(
      "payment_occurred_at_changed",
    ),
    payment_note: formData.get("payment_note"),
    payment_note_changed: formData.get("payment_note_changed"),
    payment_transaction_ids: formData.getAll("payment_transaction_id"),
  })

  if (!parsedInput.success) {
    const flattenedErrors = parsedInput.error.flatten().fieldErrors

    return {
      ...initialManualDebtRowUpdateActionState,
      status: "error",
      message: t("manualDebts.table.actions.invalidUpdate"),
      fieldErrors: {
        customer_id: flattenedErrors.customer_id?.[0],
        ticket_id: flattenedErrors.ticket_id?.[0],
        pnr: flattenedErrors.pnr?.[0],
        airline: flattenedErrors.airline?.[0],
        ticket_number: flattenedErrors.ticket_number?.[0],
        passengers: flattenedErrors.passengers?.[0],
        itinerary: flattenedErrors.itinerary?.[0],
        flight_date: flattenedErrors.flight_date?.[0],
        booked_at: flattenedErrors.booked_at?.[0],
        net_price: flattenedErrors.net_price?.[0],
        selling_price: flattenedErrors.selling_price?.[0],
        discount: flattenedErrors.discount?.[0],
        ev_price: flattenedErrors.ev_price?.[0],
        ast_price: flattenedErrors.ast_price?.[0],
        thf_price: flattenedErrors.thf_price?.[0],
        web_price: flattenedErrors.web_price?.[0],
        insurance_price: flattenedErrors.insurance_price?.[0],
        true_income: flattenedErrors.true_income?.[0],
        true_income_override: flattenedErrors.true_income_override?.[0],
        payment_method: flattenedErrors.payment_method?.[0],
        payment_method_changed: flattenedErrors.payment_method_changed?.[0],
        payment_amount: flattenedErrors.payment_amount?.[0],
        payment_amount_changed: flattenedErrors.payment_amount_changed?.[0],
        payment_occurred_at: flattenedErrors.payment_occurred_at?.[0],
        payment_occurred_at_changed:
          flattenedErrors.payment_occurred_at_changed?.[0],
        payment_note: flattenedErrors.payment_note?.[0],
        payment_note_changed: flattenedErrors.payment_note_changed?.[0],
        payment_transaction_ids:
          flattenedErrors.payment_transaction_ids?.[0],
      },
      submittedAt: Date.now(),
    }
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return {
      ...initialManualDebtRowUpdateActionState,
      status: "error",
      message: t("manualDebts.actions.missingAuth"),
      submittedAt: Date.now(),
    }
  }

  const {
    customer_id,
    ticket_id,
    true_income,
    true_income_override,
    payment_method,
    payment_method_changed,
    payment_amount,
    payment_amount_changed,
    payment_occurred_at,
    payment_occurred_at_changed,
    payment_note,
    payment_note_changed,
    payment_transaction_ids,
    ...values
  } = parsedInput.data
  try {
    const response = await fetch(buildUrl(`/tickets/${ticket_id}/correction`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...values,
        flight_date: values.flight_date.toISOString(),
        booked_at: values.booked_at ? values.booked_at.toISOString() : null,
        ...(true_income_override ? { true_income } : {}),
      }),
      cache: "no-store",
    })

    if (!response.ok) {
      return {
        ...initialManualDebtRowUpdateActionState,
        status: "error",
        message: t("manualDebts.table.actions.updateFailure"),
        submittedAt: Date.now(),
      }
    }

    if (
      payment_transaction_ids.length > 0 &&
      (payment_method_changed ||
        payment_note_changed ||
        payment_amount_changed ||
        payment_occurred_at_changed)
    ) {
      const transactionUpdate = {
        ...(payment_method_changed ? { method: payment_method ?? null } : {}),
        ...(payment_note_changed ? { note: payment_note || null } : {}),
        ...(payment_transaction_ids.length === 1 && payment_amount_changed && payment_amount !== null
          ? { amount: payment_amount }
          : {}),
        ...(payment_transaction_ids.length === 1 &&
        payment_occurred_at_changed &&
        payment_occurred_at
          ? { occurred_at: payment_occurred_at.toISOString() }
          : {}),
      }

      for (const transactionId of payment_transaction_ids) {
        const paymentResponse = await fetch(
          buildUrl(`/transactions/${transactionId}`),
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(transactionUpdate),
            cache: "no-store",
          },
        )

        if (!paymentResponse.ok) {
          return {
            ...initialManualDebtRowUpdateActionState,
            status: "error",
            message: t("manualDebts.table.actions.updateFailure"),
            submittedAt: Date.now(),
          }
        }
      }
    }
  } catch {
    return {
      ...initialManualDebtRowUpdateActionState,
      status: "error",
      message: t("manualDebts.table.actions.updateFailure"),
      submittedAt: Date.now(),
    }
  }

  revalidatePath("/debts/input")
  revalidatePath("/report")
  revalidatePath(`/customers/${customer_id}`)
  revalidatePath(`/tickets/${ticket_id}`)

  return {
    ...initialManualDebtRowUpdateActionState,
    status: "success",
    message: t("manualDebts.table.actions.updateSuccess"),
    submittedAt: Date.now(),
  }
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
