import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import { UserReadSchema, type UserRead } from "@/schemas"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: string | null
}

const API_BASE_URL = getServerApiBaseUrl()
const userListSchema = z.array(UserReadSchema)

function buildUsersUrl(path: string): string {
  return buildApiUrl(path, API_BASE_URL)
}

function getEnvelopeData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    const envelope = payload as ApiEnvelope<T>

    if (!envelope.success) {
      throw new Error(envelope.error ?? "Unable to load user data.")
    }

    return envelope.data
  }

  return payload as T
}

async function fetchAuthenticatedUsersPayload(path: string): Promise<unknown> {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value

  if (!token) {
    redirect("/login")
  }

  const response = await fetch(buildUsersUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (response.status === 401) {
    redirect("/login")
  }

  const rawPayload = (await response.json()) as unknown

  if (!response.ok) {
    const message =
      rawPayload &&
      typeof rawPayload === "object" &&
      "detail" in rawPayload &&
      typeof (rawPayload as { detail?: unknown }).detail === "string"
        ? (rawPayload as { detail: string }).detail
        : `Unable to load user data from ${path}.`

    throw new Error(message)
  }

  return rawPayload
}

export async function fetchCurrentUser(): Promise<UserRead> {
  const payload = await fetchAuthenticatedUsersPayload("/auth/me")
  return UserReadSchema.parse(getEnvelopeData(payload))
}

export async function fetchUsers(): Promise<UserRead[]> {
  const payload = await fetchAuthenticatedUsersPayload("/users/")
  return userListSchema.parse(getEnvelopeData(payload))
}
