"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { getI18n } from "@/locales/server"

const API_BASE_URL = getServerApiBaseUrl()

export type TicketLifecycleActionState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors: Record<string, string | undefined>
  submittedAt?: number
}

export const initialTicketLifecycleActionState: TicketLifecycleActionState = {
  status: "idle",
  fieldErrors: {},
}

const ticketIdentitySchema = z.object({
  ticket_id: z.string().uuid(),
  customer_id: z.string().uuid(),
})

const refundTicketSchema = ticketIdentitySchema.extend({
  amount: z.coerce.number().positive(),
})

const reassignTicketSchema = ticketIdentitySchema.extend({
  new_customer_id: z.string().uuid(),
}).refine((value) => value.customer_id !== value.new_customer_id, {
  message: "Ticket is already assigned to this customer.",
  path: ["new_customer_id"],
})

function buildUrl(path: string): string {
  return buildApiUrl(path, API_BASE_URL)
}

function getErrorMessage(payload: unknown, fallbackMessage: string): string {
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

function buildFieldErrors(
  error: z.ZodError,
): Record<string, string | undefined> {
  const fieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >

  return Object.fromEntries(
    Object.entries(fieldErrors).map(([key, value]) => [
      key,
      value?.[0],
    ]),
  )
}

function revalidateTicketSurfaces(
  ticketId: string,
  customerIds: string[],
): void {
  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath("/report")
  revalidatePath("/")

  for (const customerId of new Set(customerIds)) {
    revalidatePath(`/customers/${customerId}`)
  }
}

async function getAuthToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value ?? null
}

export async function voidTicketAction(
  previousState: TicketLifecycleActionState = initialTicketLifecycleActionState,
  formData: FormData,
): Promise<TicketLifecycleActionState> {
  void previousState
  const t = await getI18n()
  const parsedInput = ticketIdentitySchema.safeParse({
    ticket_id: formData.get("ticket_id"),
    customer_id: formData.get("customer_id"),
  })

  if (!parsedInput.success) {
    return {
      status: "error",
      message: t("tickets.actions.invalidInput"),
      fieldErrors: buildFieldErrors(parsedInput.error),
      submittedAt: Date.now(),
    }
  }

  const token = await getAuthToken()
  if (!token) {
    return {
      status: "error",
      message: t("customers.actions.recordPayment.missingAuth"),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  const { ticket_id, customer_id } = parsedInput.data
  const response = await fetch(buildUrl(`/tickets/${ticket_id}/void`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })
  const rawPayload = await parseApiPayload(response)

  if (!response.ok) {
    return {
      status: "error",
      message: getErrorMessage(rawPayload, t("tickets.actions.voidFailure")),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  revalidateTicketSurfaces(ticket_id, [customer_id])

  return {
    status: "success",
    message: t("tickets.actions.voidSuccess"),
    fieldErrors: {},
    submittedAt: Date.now(),
  }
}

export async function refundTicketAction(
  previousState: TicketLifecycleActionState = initialTicketLifecycleActionState,
  formData: FormData,
): Promise<TicketLifecycleActionState> {
  void previousState
  const t = await getI18n()
  const parsedInput = refundTicketSchema.safeParse({
    ticket_id: formData.get("ticket_id"),
    customer_id: formData.get("customer_id"),
    amount: formData.get("amount"),
  })

  if (!parsedInput.success) {
    return {
      status: "error",
      message: t("tickets.actions.invalidInput"),
      fieldErrors: buildFieldErrors(parsedInput.error),
      submittedAt: Date.now(),
    }
  }

  const token = await getAuthToken()
  if (!token) {
    return {
      status: "error",
      message: t("customers.actions.recordPayment.missingAuth"),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  const { ticket_id, customer_id, amount } = parsedInput.data
  const response = await fetch(buildUrl(`/tickets/${ticket_id}/refund`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount }),
    cache: "no-store",
  })
  const rawPayload = await parseApiPayload(response)

  if (!response.ok) {
    return {
      status: "error",
      message: getErrorMessage(rawPayload, t("tickets.actions.refundFailure")),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  revalidateTicketSurfaces(ticket_id, [customer_id])

  return {
    status: "success",
    message: t("tickets.actions.refundSuccess"),
    fieldErrors: {},
    submittedAt: Date.now(),
  }
}

export async function reassignTicketAction(
  previousState: TicketLifecycleActionState = initialTicketLifecycleActionState,
  formData: FormData,
): Promise<TicketLifecycleActionState> {
  void previousState
  const t = await getI18n()
  const parsedInput = reassignTicketSchema.safeParse({
    ticket_id: formData.get("ticket_id"),
    customer_id: formData.get("customer_id"),
    new_customer_id: formData.get("new_customer_id"),
  })

  if (!parsedInput.success) {
    return {
      status: "error",
      message: t("tickets.actions.invalidInput"),
      fieldErrors: buildFieldErrors(parsedInput.error),
      submittedAt: Date.now(),
    }
  }

  const token = await getAuthToken()
  if (!token) {
    return {
      status: "error",
      message: t("customers.actions.recordPayment.missingAuth"),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  const { ticket_id, customer_id, new_customer_id } = parsedInput.data
  const response = await fetch(buildUrl(`/tickets/${ticket_id}/reassign`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ new_customer_id }),
    cache: "no-store",
  })
  const rawPayload = await parseApiPayload(response)

  if (!response.ok) {
    return {
      status: "error",
      message: getErrorMessage(rawPayload, t("tickets.actions.reassignFailure")),
      fieldErrors: {},
      submittedAt: Date.now(),
    }
  }

  revalidateTicketSurfaces(ticket_id, [customer_id, new_customer_id])

  return {
    status: "success",
    message: t("tickets.actions.reassignSuccess"),
    fieldErrors: {},
    submittedAt: Date.now(),
  }
}
