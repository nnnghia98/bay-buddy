import { TicketImportsWorkbench } from "@/app/extract-ticket/ticket-imports-workbench"
import { AuthenticatedApiError } from "@/lib/server-api"
import { fetchTicketImports } from "@/lib/server-ticket-imports"
import type { TicketImport } from "@/schemas"

async function loadTicketImports(): Promise<{
  imports: TicketImport[]
  isBackendUnavailable: boolean
}> {
  try {
    return {
      imports: await fetchTicketImports(),
      isBackendUnavailable: false,
    }
  } catch (error) {
    if (error instanceof AuthenticatedApiError && error.status === 404) {
      return {
        imports: [],
        isBackendUnavailable: true,
      }
    }

    throw error
  }
}

export default async function TicketImportsPage() {
  const { imports, isBackendUnavailable } = await loadTicketImports()

  return (
    <TicketImportsWorkbench
      initialImports={imports}
      isBackendUnavailable={isBackendUnavailable}
    />
  )
}
