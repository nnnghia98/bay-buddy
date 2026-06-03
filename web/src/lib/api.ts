import { expireStoredSession, getActiveStoredToken } from "@/lib/auth-storage"
import { buildApiUrl, getClientApiBaseUrl } from "@/lib/api-base"

const API_BASE_URL = getClientApiBaseUrl()

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

export type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: string | null
}

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }

  return buildApiUrl(path, API_BASE_URL)
}

function getErrorMessage(payload: unknown, fallback: string): string {
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

  return fallback
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)

  if (!headers.has("Authorization")) {
    const token = getActiveStoredToken()
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  })

  const rawText = await response.text()
  let payload: unknown = null

  if (rawText) {
    try {
      payload = JSON.parse(rawText)
    } catch {
      payload = rawText
    }
  }

  if (!response.ok) {
    const error = new ApiError(
      getErrorMessage(payload, `Request failed with status ${response.status}`),
      response.status,
      payload,
    )

    if (response.status === 401) {
      expireStoredSession("unauthorized")
    }

    throw error
  }

  return payload as T
}

export async function apiFetchData<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const payload = await apiFetch<T | ApiEnvelope<T>>(path, init)

  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export function createAuthHeader(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  }
}
