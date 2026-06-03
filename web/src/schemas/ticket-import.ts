import { z } from "zod"

export const TicketImportSourceSchema = z.enum(["INBOUND_EMAIL", "UPLOAD"])
export const TicketImportStatusSchema = z.enum(["READY", "FAILED", "CONFIRMED"])

export const TicketImportSchema = z.object({
  id: z.string().uuid(),
  source: TicketImportSourceSchema,
  status: TicketImportStatusSchema,
  sender_email: z.string().nullable().optional(),
  recipient_email: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  provider_message_id: z.string().nullable().optional(),
  dedupe_key: z.string().nullable().optional(),
  original_filename: z.string().nullable().optional(),
  original_mime_type: z.string().nullable().optional(),
  redaction_summary: z.record(z.string(), z.unknown()).default({}),
  parsed_payload: z.record(z.string(), z.unknown()).nullable().optional(),
  failure_reason: z.string().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  linked_ticket_id: z.string().uuid().nullable().optional(),
  original_content: z.string().nullable().optional(),
  redacted_content: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const TicketImportListSchema = z.array(TicketImportSchema)

export type TicketImport = z.infer<typeof TicketImportSchema>
export type TicketImportSource = z.infer<typeof TicketImportSourceSchema>
export type TicketImportStatus = z.infer<typeof TicketImportStatusSchema>

export type TicketImportActionState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors: Record<string, string | undefined>
  submittedAt?: number
  importId?: string | null
}

export const initialTicketImportActionState: TicketImportActionState = {
  status: "idle",
  fieldErrors: {},
  importId: null,
}

