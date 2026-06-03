import { TicketImportsWorkbench } from "@/app/extract-ticket/ticket-imports-workbench"
import { fetchTicketImports } from "@/lib/server-ticket-imports"

export default async function TicketImportsPage() {
  const imports = await fetchTicketImports()

  return <TicketImportsWorkbench initialImports={imports} />
}
