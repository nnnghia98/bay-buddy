import "server-only"

import { z } from "zod"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import { TicketReadSchema, type TicketRead } from "@/schemas"

const ticketListSchema = z.array(TicketReadSchema)

export async function fetchTicket(ticketId: string): Promise<TicketRead> {
  const payload = await fetchAuthenticatedApiPayload(
    `/tickets/${ticketId}`,
    "Unable to load ticket.",
  )

  return TicketReadSchema.parse(getEnvelopeData(payload))
}

export async function fetchTickets(limit = 500): Promise<TicketRead[]> {
  const payload = await fetchAuthenticatedApiPayload(
    `/tickets?limit=${limit}`,
    "Unable to load tickets.",
  )

  return ticketListSchema.parse(getEnvelopeData(payload))
}
