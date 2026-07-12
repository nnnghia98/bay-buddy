import { EditorWorkbench } from "@/components/workbook-editor/editor-workbench"
import {
  fetchWorkbookRecordsServer,
  fetchWorkbookSessionServer,
} from "@/lib/workbooks/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

type WorkbookSessionPageProps = {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const sortableFields = new Set([
  "passenger_name",
  "pnr",
  "ticket_number",
  "net_price",
  "selling_price",
])

export default async function WorkbookSessionPage({ params, searchParams }: WorkbookSessionPageProps) {
  const { sessionId } = await params
  const rawQuery = await searchParams
  const rawPage = Array.isArray(rawQuery.page) ? rawQuery.page[0] : rawQuery.page
  const rawSearch = Array.isArray(rawQuery.search) ? rawQuery.search[0] : rawQuery.search
  const rawSortBy = Array.isArray(rawQuery.sort_by) ? rawQuery.sort_by[0] : rawQuery.sort_by
  const rawDirection = Array.isArray(rawQuery.sort_direction)
    ? rawQuery.sort_direction[0]
    : rawQuery.sort_direction
  const page = rawPage && /^\d+$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1
  const search = rawSearch?.trim().slice(0, 255) ?? ""
  const sortBy = rawSortBy && sortableFields.has(rawSortBy)
    ? rawSortBy as "passenger_name" | "pnr" | "ticket_number" | "net_price" | "selling_price"
    : undefined
  const sortDirection = rawDirection === "desc" ? "desc" : "asc"
  const [session, records] = await Promise.all([
    fetchWorkbookSessionServer(sessionId),
    fetchWorkbookRecordsServer(sessionId, { page, pageSize: 50, search, sortBy, sortDirection }),
  ])

  return (
    <EditorWorkbench
      initialQuery={{ page, search, sortBy, sortDirection }}
      initialRecords={records}
      initialSession={session}
    />
  )
}
