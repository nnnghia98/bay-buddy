"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import {
  parseCurrencyInput,
  parseSignedCurrencyInput,
} from "@/lib/formatters"
import { createManualDebtFromFormData } from "@/lib/server-manual-debt"
import {
  initialManualDebtActionState,
  paymentMethodOptions,
  type ManualDebtActionState,
} from "@/schemas"

const API_BASE_URL = getServerApiBaseUrl()

const amountFromForm = z.preprocess(
  (value) => parseCurrencyInput(String(value ?? "")),
  z.number().min(0),
)

const incomeFromForm = z.preprocess(
  (value) => parseSignedCurrencyInput(String(value ?? "")),
  z.number(),
)

const overrideFromForm = z.preprocess(
  (value) => value === true || value === "true",
  z.boolean(),
)

const paymentMethodFromForm = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined
    }

    const normalizedValue = value.trim()
    return normalizedValue || undefined
  },
  z.enum(paymentMethodOptions).optional(),
)

const passengersFromForm = z
  .string()
  .trim()
  .transform((value) =>
    value
      .split(/[\n,]+/)
      .map((passenger) => passenger.trim())
      .filter(Boolean),
  )

const manualDebtRowUpdateSchema = z.object({
  customer_id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  booked_at: z.coerce.date().nullable(),
  passengers: passengersFromForm,
  selling_price: amountFromForm,
  discount: amountFromForm,
  ev_price: amountFromForm,
  ast_price: amountFromForm,
  thf_price: amountFromForm,
  web_price: amountFromForm,
  insurance_price: amountFromForm,
  true_income: incomeFromForm,
  true_income_override: overrideFromForm,
  payment_method: paymentMethodFromForm,
  payment_transaction_ids: z.array(z.string().uuid()),
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
    passengers: formData.get("passengers"),
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
    payment_transaction_ids: formData.getAll("payment_transaction_id"),
  })

  if (!parsedInput.success) {
    return
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return
  }

  const {
    customer_id,
    ticket_id,
    true_income,
    true_income_override,
    payment_method,
    payment_transaction_ids,
    ...values
  } = parsedInput.data
  const response = await fetch(buildUrl(`/tickets/${ticket_id}/correction`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...values,
      booked_at: values.booked_at ? values.booked_at.toISOString() : null,
      ...(true_income_override ? { true_income } : {}),
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    return
  }

  if (payment_method && payment_transaction_ids.length > 0) {
    for (const transactionId of payment_transaction_ids) {
      const paymentResponse = await fetch(
        buildUrl(`/transactions/${transactionId}`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ method: payment_method }),
          cache: "no-store",
        },
      )

      if (!paymentResponse.ok) {
        return
      }
    }
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
