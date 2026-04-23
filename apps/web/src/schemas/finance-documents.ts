import { z } from "zod"

export const InvoiceStatusSchema = z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"])
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>

export const QuoteStatusSchema = z.enum(["DRAFT", "ACCEPTED", "EXPIRED", "CANCELLED"])
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>

const MoneySchema = z.number()

const NullableSnapshotTextSchema = z.string().nullable()

export const InvoiceItemSchema = z.object({
  id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  linked_ticket_id: z.string().uuid().nullable(),
  description: z.string(),
  quantity: z.number().positive(),
  unit_price: MoneySchema,
  unit_price_snapshot: MoneySchema,
  passenger_name_snapshot: z.string(),
  total: MoneySchema,
})
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>

export const InvoiceReadSchema = z.object({
  id: z.string().uuid(),
  invoice_number: z.string(),
  customer_id: z.string().uuid(),
  customer_name_snapshot: z.string(),
  customer_address_snapshot: NullableSnapshotTextSchema,
  customer_tax_code_snapshot: NullableSnapshotTextSchema,
  total_amount: MoneySchema,
  tax_amount: MoneySchema,
  discount_amount: MoneySchema,
  status: InvoiceStatusSchema,
  note: z.string().nullable(),
  issued_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
})
export type InvoiceRead = z.infer<typeof InvoiceReadSchema>

export const InvoiceListItemSchema = InvoiceReadSchema.extend({
  amount_in_words: z.string(),
})
export type InvoiceListItem = z.infer<typeof InvoiceListItemSchema>

export const CustomerInvoiceListSchema = z.array(InvoiceListItemSchema)
export type CustomerInvoiceList = z.infer<typeof CustomerInvoiceListSchema>

export const InvoiceDetailSchema = InvoiceReadSchema.extend({
  items: z.array(InvoiceItemSchema),
  amount_in_words: z.string(),
})
export type InvoiceDetail = z.infer<typeof InvoiceDetailSchema>

export const InvoicePublicBrandSchema = z.object({
  company_name: z.string(),
  slogan: z.string(),
  support_email: z.string(),
  hotline: z.string(),
})
export type InvoicePublicBrand = z.infer<typeof InvoicePublicBrandSchema>

export const InvoicePublicViewSchema = z.object({
  brand: InvoicePublicBrandSchema,
  invoice: InvoiceReadSchema,
  items: z.array(InvoiceItemSchema),
  amount_in_words: z.string(),
})
export type InvoicePublicView = z.infer<typeof InvoicePublicViewSchema>

export const QuoteItemSchema = z.object({
  id: z.string().uuid(),
  quote_id: z.string().uuid(),
  linked_ticket_id: z.string().uuid().nullable(),
  description: z.string(),
  quantity: z.number().positive(),
  unit_price: MoneySchema,
  unit_price_snapshot: MoneySchema,
  passenger_name_snapshot: z.string(),
  total: MoneySchema,
})
export type QuoteItem = z.infer<typeof QuoteItemSchema>

export const QuoteReadSchema = z.object({
  id: z.string().uuid(),
  quote_number: z.string(),
  customer_id: z.string().uuid(),
  customer_name_snapshot: z.string(),
  customer_address_snapshot: NullableSnapshotTextSchema,
  customer_tax_code_snapshot: NullableSnapshotTextSchema,
  total_amount: MoneySchema,
  tax_amount: MoneySchema,
  discount_amount: MoneySchema,
  valid_until: z.coerce.date(),
  status: QuoteStatusSchema,
  note: z.string().nullable(),
  created_at: z.coerce.date(),
})
export type QuoteRead = z.infer<typeof QuoteReadSchema>

export const QuoteDetailSchema = QuoteReadSchema.extend({
  items: z.array(QuoteItemSchema),
  amount_in_words: z.string(),
})
export type QuoteDetail = z.infer<typeof QuoteDetailSchema>

export const QuoteConvertResponseSchema = z.object({
  quote: QuoteReadSchema,
  invoice: InvoiceReadSchema,
})
export type QuoteConvertResponse = z.infer<typeof QuoteConvertResponseSchema>
