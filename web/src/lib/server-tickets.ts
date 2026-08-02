import "server-only"

import { z } from "zod"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import {
  TicketPageSchema,
  TicketReadSchema,
  type TicketPage,
  type TicketRead,
} from "@/schemas"

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

export type TicketPageQuery = {
  page?: number
  page_size?: number
  q?: string
  status?: string
  from?: string
  to?: string
}

export async function fetchTicketsPage(
  query: TicketPageQuery = {},
): Promise<TicketPage> {
  const params = new URLSearchParams()
  params.set("page", String(query.page ?? 1))
  params.set("page_size", String(query.page_size ?? 50))
  for (const key of ["q", "status", "from", "to"] as const) {
    if (query[key]) {
      params.set(key, query[key] as string)
    }
  }

  const payload = await fetchAuthenticatedApiPayload(
    `/tickets?${params.toString()}`,
    "Unable to load tickets.",
  )

  return TicketPageSchema.parse(getEnvelopeData(payload))
}
