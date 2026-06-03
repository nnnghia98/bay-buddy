"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"
import vi from "@/locales/vi"
import {
  TicketImportSchema,
  initialTicketImportActionState,
  type TicketImportActionState,
} from "@/schemas"

const API_BASE_URL = getServerApiBaseUrl()
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const actionCopy = vi.ticketImports.actions
const ALLOWED_TYPES = new Set([
  "text/html",
  "message/rfc822",
])

function resolveFileType(file: File): string {
  if (file.type) {
    return file.type
  }

  const fileName = file.name.toLowerCase()
  if (fileName.endsWith(".eml")) {
    return "message/rfc822"
  }
  if (fileName.endsWith(".html") || fileName.endsWith(".htm")) {
    return "text/html"
  }
  return "application/octet-stream"
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

function getEnvelopeData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return (payload as { data: T }).data
  }

  return payload as T
}

export async function uploadTicketImportAction(
  previousState: TicketImportActionState = initialTicketImportActionState,
  formData: FormData,
): Promise<TicketImportActionState> {
  void previousState
  const file = formData.get("file")

  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message: actionCopy.fileRequired,
      fieldErrors: { file: actionCopy.fileRequired },
      submittedAt: Date.now(),
      importId: null,
    }
  }

  const fileType = resolveFileType(file)

  if (!ALLOWED_TYPES.has(fileType)) {
    return {
      status: "error",
      message: actionCopy.unsupportedFile,
      fieldErrors: { file: actionCopy.unsupportedFile },
      submittedAt: Date.now(),
      importId: null,
    }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      status: "error",
      message: actionCopy.fileTooLarge,
      fieldErrors: { file: actionCopy.fileTooLarge },
      submittedAt: Date.now(),
      importId: null,
    }
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return {
      status: "error",
      message: vi.customers.actions.recordPayment.missingAuth,
      fieldErrors: {},
      submittedAt: Date.now(),
      importId: null,
    }
  }

  const uploadBody = new FormData()
  uploadBody.append("file", file)

  const response = await fetch(buildUrl("/ticket-imports/uploads"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: uploadBody,
    cache: "no-store",
  })
  const rawPayload = await parseApiPayload(response)

  if (!response.ok) {
    return {
      status: "error",
      message: getErrorMessage(rawPayload, actionCopy.uploadFailure),
      fieldErrors: {},
      submittedAt: Date.now(),
      importId: null,
    }
  }

  const parsedImport = TicketImportSchema.safeParse(getEnvelopeData(rawPayload))
  if (!parsedImport.success) {
    return {
      status: "error",
      message: actionCopy.uploadFailure,
      fieldErrors: {},
      submittedAt: Date.now(),
      importId: null,
    }
  }

  revalidatePath("/extract-ticket")

  return {
    status: "success",
    message: actionCopy.uploadSuccess,
    fieldErrors: {},
    submittedAt: Date.now(),
    importId: parsedImport.data.id,
  }
}
