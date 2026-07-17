import { WorkbookStartClient } from "@/app/workbook-editor-v2/workbook-start-client"
import { fetchCurrentUser } from "@/lib/server-users"
import { fetchWorkbookSessionsServer } from "@/lib/workbooks/server"

export default async function WorkbookEditorV2Page() {
  const [currentUser, initialSessions] = await Promise.all([
    fetchCurrentUser(),
    fetchWorkbookSessionsServer({ page: 1, pageSize: 10 }),
  ])

  return (
    <WorkbookStartClient
      initialSessions={initialSessions}
      userId={currentUser.id}
    />
  )
}
