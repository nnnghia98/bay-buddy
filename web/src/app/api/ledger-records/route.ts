import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"

const API_BASE_URL = getServerApiBaseUrl()

const deleteLedgerRecordSchema = z.object({
  record_id: z.string().uuid(),
  record_type: z.enum(["ticket", "transaction"]),
})

function buildUrl(path: string): string {
  return buildApiUrl(path, API_BASE_URL)
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

export async function DELETE(request: Request) {
  const parsedInput = deleteLedgerRecordSchema.safeParse(await request.json())

  if (!parsedInput.success) {
    return NextResponse.json(
      { error: "Invalid ledger record delete payload." },
      { status: 400 },
    )
  }

  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_KEY)?.value
  if (!token) {
    return NextResponse.json({ error: "Missing authentication." }, { status: 401 })
  }

  const { record_id, record_type } = parsedInput.data
  const path =
    record_type === "ticket"
      ? `/tickets/${record_id}/correction`
      : `/transactions/${record_id}`

  const response = await fetch(buildUrl(path), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })
  const payload = await parseApiPayload(response)

  return NextResponse.json(payload, { status: response.status })
}
