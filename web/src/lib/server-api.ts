import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  AUTH_TOKEN_COOKIE_KEY,
  LOGIN_PATH,
  SESSION_EXPIRED_LOGIN_PATH,
} from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: string | null
}

const API_BASE_URL = getServerApiBaseUrl()

export class AuthenticatedApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "AuthenticatedApiError"
    this.status = status
  }
}

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

export function getEnvelopeData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    const envelope = payload as ApiEnvelope<T>

    if (!envelope.success) {
      throw new Error(envelope.error ?? "Unable to load API data.")
    }

    return envelope.data
  }

  return payload as T
}

export async function fetchAuthenticatedApiPayload(
  path: string,
  fallbackMessage: string,
): Promise<unknown> {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value

  if (!token) {
    redirect(LOGIN_PATH)
  }

  const response = await fetch(buildUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (response.status === 401) {
    redirect(SESSION_EXPIRED_LOGIN_PATH)
  }

  const payload = await parseApiPayload(response)

  if (!response.ok) {
    throw new AuthenticatedApiError(
      getErrorMessage(payload, fallbackMessage),
      response.status,
    )
  }

  return payload
}
