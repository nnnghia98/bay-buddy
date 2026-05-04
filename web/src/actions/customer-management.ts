"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { getI18n } from "@/locales/server"
import {
  CustomerReadSchema,
  createToggleCustomerActiveFormSchema,
  createUpdateCustomerFormSchema,
  getCustomerManagementValidationMessages,
  initialCustomerManagementActionState,
  type CustomerManagementActionState,
} from "@/schemas"

const API_BASE_URL = getServerApiBaseUrl()

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

async function readJsonResponse(response: Response): Promise<unknown> {
  const rawText = await response.text()
  if (!rawText) {
    return null
  }

  try {
    return JSON.parse(rawText) as unknown
  } catch {
    return rawText
  }
}

function getEnvelopeData(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: unknown }).data
  }

  return payload
}

async function submitCustomerPatch(
  customerId: string,
  payload: Record<string, unknown>,
  successMessage: string,
  failureMessage: string,
): Promise<CustomerManagementActionState> {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value

  if (!token) {
    return {
      ...initialCustomerManagementActionState,
      status: "error",
      message: (await getI18n())("customers.management.actions.missingAuth"),
      submittedAt: Date.now(),
    }
  }

  const response = await fetch(buildUrl(`/customers/${customerId}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const rawPayload = await readJsonResponse(response)

  if (!response.ok) {
    return {
      ...initialCustomerManagementActionState,
      status: "error",
      message: getErrorMessage(rawPayload, failureMessage),
      submittedAt: Date.now(),
    }
  }

  const parsedCustomer = CustomerReadSchema.safeParse(getEnvelopeData(rawPayload))
  if (!parsedCustomer.success) {
    return {
      ...initialCustomerManagementActionState,
      status: "error",
      message: failureMessage,
      submittedAt: Date.now(),
    }
  }

  revalidatePath("/customers")
  revalidatePath(`/customers/${customerId}`)

  return {
    ...initialCustomerManagementActionState,
    status: "success",
    message: successMessage,
    submittedAt: Date.now(),
    customerId,
  }
}

export async function updateCustomerAction(
  previousState: CustomerManagementActionState = initialCustomerManagementActionState,
  formData: FormData,
): Promise<CustomerManagementActionState> {
  void previousState

  const t = await getI18n()
  const schema = createUpdateCustomerFormSchema(
    getCustomerManagementValidationMessages(t),
  )

  const parsedInput = schema.safeParse({
    customer_id: formData.get("customer_id"),
    name: formData.get("name"),
    type: formData.get("type"),
    is_active: formData.get("is_active"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    tax_code: formData.get("tax_code"),
  })

  if (!parsedInput.success) {
    const flattenedErrors = parsedInput.error.flatten().fieldErrors
    return {
      ...initialCustomerManagementActionState,
      status: "error",
      message: t("customers.management.actions.invalidInput"),
      fieldErrors: {
        customer_id: flattenedErrors.customer_id?.[0],
        name: flattenedErrors.name?.[0],
        type: flattenedErrors.type?.[0],
        is_active: flattenedErrors.is_active?.[0],
        email: flattenedErrors.email?.[0],
        phone: flattenedErrors.phone?.[0],
        address: flattenedErrors.address?.[0],
        tax_code: flattenedErrors.tax_code?.[0],
      },
      submittedAt: Date.now(),
    }
  }

  const { customer_id, ...payload } = parsedInput.data
  return submitCustomerPatch(
    customer_id,
    payload,
    t("customers.management.actions.updateSuccess"),
    t("customers.management.actions.failure"),
  )
}

export async function toggleCustomerActiveAction(
  previousState: CustomerManagementActionState = initialCustomerManagementActionState,
  formData: FormData,
): Promise<CustomerManagementActionState> {
  void previousState

  const t = await getI18n()
  const schema = createToggleCustomerActiveFormSchema(
    getCustomerManagementValidationMessages(t),
  )

  const parsedInput = schema.safeParse({
    customer_id: formData.get("customer_id"),
    is_active: formData.get("is_active"),
  })

  if (!parsedInput.success) {
    const flattenedErrors = parsedInput.error.flatten().fieldErrors
    return {
      ...initialCustomerManagementActionState,
      status: "error",
      message: t("customers.management.actions.invalidInput"),
      fieldErrors: {
        customer_id: flattenedErrors.customer_id?.[0],
        is_active: flattenedErrors.is_active?.[0],
      },
      submittedAt: Date.now(),
    }
  }

  return submitCustomerPatch(
    parsedInput.data.customer_id,
    { is_active: parsedInput.data.is_active },
    t("customers.management.actions.toggleSuccess"),
    t("customers.management.actions.failure"),
  )
}
