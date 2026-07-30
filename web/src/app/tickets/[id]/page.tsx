import Link from "next/link"
import { notFound } from "next/navigation"

import { TicketDetailClient } from "@/app/tickets/[id]/ticket-detail-client"
import { Button } from "@/components/ui/button"
import { AuthenticatedApiError } from "@/lib/server-api"
import { fetchCustomerDirectory } from "@/lib/server-customers"
import { fetchTicket } from "@/lib/server-tickets"
import { fetchCurrentUser } from "@/lib/server-users"
import { getI18n } from "@/locales/server"
import type { TicketRead } from "@/schemas"
import patterns from "@/styles/ui-patterns.module.css"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params
  let ticketResult: TicketRead

  try {
    ticketResult = await fetchTicket(id)
  } catch (error) {
    if (error instanceof AuthenticatedApiError && error.status === 404) {
      notFound()
    }

    throw error
  }

  const [t, currentUser, customers] = await Promise.all([
    getI18n(),
    fetchCurrentUser(),
    fetchCustomerDirectory(500),
  ])

  return (
    <div className={patterns.sectionStack}>
      <div>
        <Button
          as={Link}
          href={`/customers/${ticketResult.customer_id}`}
          variant="outline"
        >
          {t("tickets.detail.backToCustomer")}
        </Button>
      </div>

      <TicketDetailClient
        currentUserRole={currentUser.role}
        customers={customers}
        ticket={ticketResult}
      />
    </div>
  )
}
