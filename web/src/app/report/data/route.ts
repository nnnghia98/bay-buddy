import { NextResponse } from "next/server"

import { fetchLedgerReportRows } from "@/lib/server-report"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get("from") ?? undefined
  const to = url.searchParams.get("to") ?? undefined
  const rows = await fetchLedgerReportRows({ from, to })

  return NextResponse.json({ rows })
}
