"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { getI18n } from "@/locales/server"
import {
  UserReadSchema,
  createCreateUserFormSchema,
  createToggleUserActiveFormSchema,
  createUpdateUserFormSchema,
  getSettingsUserValidationMessages,
  initialSettingsUserActionState,
  type SettingsUserActionState,
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
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return (payload as { data: unknown }).data
  }

  return payload
}

async function getAuthToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value ?? null
}

async function submitUserMutation(
  path: string,
  method: "POST" | "PATCH",
  payload: Record<string, unknown>,
  successMessage: string,
  failureMessage: string,
): Promise<SettingsUserActionState> {
  const token = await getAuthToken()

  if (!token) {
    return {
      ...initialSettingsUserActionState,
      status: "error",
      message: (await getI18n())("settings.users.actions.missingAuth"),
      submittedAt: Date.now(),
    }
  }

  const response = await fetch(buildUrl(path), {
    method,
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
      ...initialSettingsUserActionState,
      status: "error",
      message: getErrorMessage(rawPayload, failureMessage),
      submittedAt: Date.now(),
    }
  }

  const parsedUserResult = UserReadSchema.safeParse(getEnvelopeData(rawPayload))

  if (!parsedUserResult.success) {
    return {
      ...initialSettingsUserActionState,
      status: "error",
      message: failureMessage,
      submittedAt: Date.now(),
    }
  }

  revalidatePath("/settings")

  return {
    ...initialSettingsUserActionState,
    status: "success",
    message: successMessage,
    submittedAt: Date.now(),
    userId: parsedUserResult.data.id,
  }
}

export async function createUserAction(
  previousState: SettingsUserActionState = initialSettingsUserActionState,
  formData: FormData,
): Promise<SettingsUserActionState> {
  void previousState

  const t = await getI18n()
  const createUserFormSchema = createCreateUserFormSchema(
    getSettingsUserValidationMessages(t),
  )

  const parsedInput = createUserFormSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    role: formData.get("role"),
    is_active: formData.get("is_active"),
  })

  if (!parsedInput.success) {
    const flattenedErrors = parsedInput.error.flatten().fieldErrors

    return {
      ...initialSettingsUserActionState,
      status: "error",
      message: t("settings.users.actions.invalidInput"),
      fieldErrors: {
        username: flattenedErrors.username?.[0],
        password: flattenedErrors.password?.[0],
        role: flattenedErrors.role?.[0],
        is_active: flattenedErrors.is_active?.[0],
      },
      submittedAt: Date.now(),
    }
  }

  return submitUserMutation(
    "/users/",
    "POST",
    parsedInput.data,
    t("settings.users.actions.createSuccess"),
    t("settings.users.actions.failure"),
  )
}

export async function updateUserAction(
  previousState: SettingsUserActionState = initialSettingsUserActionState,
  formData: FormData,
): Promise<SettingsUserActionState> {
  void previousState

  const t = await getI18n()
  const updateUserFormSchema = createUpdateUserFormSchema(
    getSettingsUserValidationMessages(t),
  )

  const parsedInput = updateUserFormSchema.safeParse({
    user_id: formData.get("user_id"),
    username: formData.get("username"),
    password: formData.get("password"),
    role: formData.get("role"),
    is_active: formData.get("is_active"),
  })

  if (!parsedInput.success) {
    const flattenedErrors = parsedInput.error.flatten().fieldErrors

    return {
      ...initialSettingsUserActionState,
      status: "error",
      message: t("settings.users.actions.invalidInput"),
      fieldErrors: {
        user_id: flattenedErrors.user_id?.[0],
        username: flattenedErrors.username?.[0],
        password: flattenedErrors.password?.[0],
        role: flattenedErrors.role?.[0],
        is_active: flattenedErrors.is_active?.[0],
      },
      submittedAt: Date.now(),
    }
  }

  const { user_id, ...payload } = parsedInput.data

  return submitUserMutation(
    `/users/${user_id}`,
    "PATCH",
    payload,
    t("settings.users.actions.updateSuccess"),
    t("settings.users.actions.failure"),
  )
}

export async function toggleUserActiveAction(
  previousState: SettingsUserActionState = initialSettingsUserActionState,
  formData: FormData,
): Promise<SettingsUserActionState> {
  void previousState

  const t = await getI18n()
  const toggleUserActiveFormSchema = createToggleUserActiveFormSchema(
    getSettingsUserValidationMessages(t),
  )

  const parsedInput = toggleUserActiveFormSchema.safeParse({
    user_id: formData.get("user_id"),
    is_active: formData.get("is_active"),
  })

  if (!parsedInput.success) {
    const flattenedErrors = parsedInput.error.flatten().fieldErrors

    return {
      ...initialSettingsUserActionState,
      status: "error",
      message: t("settings.users.actions.invalidInput"),
      fieldErrors: {
        user_id: flattenedErrors.user_id?.[0],
        is_active: flattenedErrors.is_active?.[0],
      },
      submittedAt: Date.now(),
    }
  }

  return submitUserMutation(
    `/users/${parsedInput.data.user_id}`,
    "PATCH",
    {
      is_active: parsedInput.data.is_active,
    },
    t("settings.users.actions.toggleSuccess"),
    t("settings.users.actions.failure"),
  )
}
