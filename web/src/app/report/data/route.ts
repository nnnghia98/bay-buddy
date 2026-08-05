import { NextResponse } from "next/server"

import { AUTH_TOKEN_COOKIE_KEY } from "@/lib/auth-token"
import {
  fetchTicketDebtExportRows,
  fetchTicketDebtPage,
} from "@/lib/server-report"

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
  const page = Number(url.searchParams.get("page") ?? "1")
  const pageSize = Number(url.searchParams.get("page_size") ?? "50")
  const query = url.searchParams.get("q") ?? undefined
  const from = url.searchParams.get("from") ?? undefined
  const to = url.searchParams.get("to") ?? undefined
  const exportAll = url.searchParams.get("all") === "1"
  try {
    if (exportAll) {
      const rows = await fetchTicketDebtExportRows({
        date_basis: "booked_at",
        from,
        q: query,
        to,
      })
      return NextResponse.json({ rows })
    }

    const reportPage = await fetchTicketDebtPage({
      date_basis: "booked_at",
      from,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      page_size:
        Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 50,
      q: query,
      to,
    })

    return NextResponse.json(reportPage)
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
