import { NextResponse } from "next/server"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import { fetchLedgerReportRows } from "@/lib/server-report"

function isNextRedirectError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get("from") ?? undefined
  const to = url.searchParams.get("to") ?? undefined
  try {
    const rows = await fetchLedgerReportRows({ from, to })

    return NextResponse.json({ rows })
  } catch (error) {
    if (isNextRedirectError(error)) {
      const response = NextResponse.json(
        { error: "Session expired." },
        { status: 401 },
      )
      response.cookies.delete(AUTH_TOKEN_COOKIE_KEY)
      return response
    }

    throw error
  }
}
