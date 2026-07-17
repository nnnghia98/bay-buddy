import { EditorWorkbench } from "@/components/workbook-editor/editor-workbench"
import { fetchCurrentUser } from "@/lib/server-users"
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
  const requestedSortBy = rawSortBy && rawSortBy.length <= 64 ? rawSortBy : undefined
  const sortDirection = rawDirection === "desc" ? "desc" : "asc"
  const [currentUser, session] = await Promise.all([
    fetchCurrentUser(),
    fetchWorkbookSessionServer(sessionId),
  ])
  const sortableColumnIds = new Set(session.column_config.map((column) => column.id))
  const sortBy = requestedSortBy && sortableColumnIds.has(requestedSortBy)
    ? requestedSortBy
    : undefined
  const records = await fetchWorkbookRecordsServer(sessionId, {
    page,
    pageSize: 50,
    search,
    sortBy,
    sortDirection,
  })

  return (
    <EditorWorkbench
      initialQuery={{ page, search, sortBy, sortDirection }}
      initialRecords={records}
      initialSession={session}
      userId={currentUser.id}
    />
  )
}
