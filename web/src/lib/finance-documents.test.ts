import { describe, expect, it } from "vitest"

import {
  InvoiceDetailSchema,
  InvoicePublicViewSchema,
  QuoteDetailSchema,
} from "@/schemas/finance-documents"

describe("finance document schemas", () => {
  it("parses an invoice detail snapshot payload", () => {
    const parsed = InvoiceDetailSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      invoice_number: "BB-202604-0001",
      customer_id: "550e8400-e29b-41d4-a716-446655440001",
      customer_name_snapshot: "Cong ty Bay Buddy",
      customer_address_snapshot: "1 Nguyen Hue",
      customer_tax_code_snapshot: "0312345678",
      total_amount: 1500000,
      tax_amount: 0,
      discount_amount: 0,
      status: "DRAFT",
      note: "Invoice note",
      issued_at: null,
      created_at: "2026-04-23T08:00:00Z",
      amount_in_words: "Một triệu năm trăm nghìn đồng",
      items: [
        {
          id: "550e8400-e29b-41d4-a716-446655440002",
          invoice_id: "550e8400-e29b-41d4-a716-446655440000",
          linked_ticket_id: "550e8400-e29b-41d4-a716-446655440003",
          description: "Vé máy bay PNR ABC123",
          quantity: 1,
          unit_price: 1500000,
          unit_price_snapshot: 1500000,
          passenger_name_snapshot: "NGUYEN VAN A",
          total: 1500000,
        },
      ],
    })

    expect(parsed.invoice_number).toBe("BB-202604-0001")
    expect(parsed.created_at).toBeInstanceOf(Date)
    expect(parsed.items[0].linked_ticket_id).toBe(
      "550e8400-e29b-41d4-a716-446655440003",
    )
    expect(parsed.items[0].passenger_name_snapshot).toBe("NGUYEN VAN A")
  })

  it("parses a public invoice payload with brand info", () => {
    const parsed = InvoicePublicViewSchema.parse({
      brand: {
        company_name: "Bay Buddy",
        slogan: "Flight and debt management",
        support_email: "support@baybuddy.test",
        hotline: "0900000000",
      },
      invoice: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        invoice_number: "BB-202604-0001",
        customer_id: "550e8400-e29b-41d4-a716-446655440001",
        customer_name_snapshot: "Cong ty Bay Buddy",
        customer_address_snapshot: null,
        customer_tax_code_snapshot: null,
        total_amount: 1500000,
        tax_amount: 0,
        discount_amount: 0,
        status: "ISSUED",
        note: null,
        issued_at: "2026-04-23T09:00:00Z",
        created_at: "2026-04-23T08:00:00Z",
      },
      amount_in_words: "Một triệu năm trăm nghìn đồng",
      items: [],
    })

    expect(parsed.brand.company_name).toBe("Bay Buddy")
    expect(parsed.invoice.status).toBe("ISSUED")
    expect(parsed.invoice.issued_at).toBeInstanceOf(Date)
  })

  it("parses a quote detail snapshot payload", () => {
    const parsed = QuoteDetailSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440010",
      quote_number: "BQ-202604-0001",
      customer_id: "550e8400-e29b-41d4-a716-446655440001",
      customer_name_snapshot: "Cong ty Bay Buddy",
      customer_address_snapshot: null,
      customer_tax_code_snapshot: null,
      total_amount: 1500000,
      tax_amount: 0,
      discount_amount: 0,
      valid_until: "2026-05-01T00:00:00Z",
      status: "DRAFT",
      note: null,
      created_at: "2026-04-23T08:00:00Z",
      amount_in_words: "Một triệu năm trăm nghìn đồng",
      items: [],
    })

    expect(parsed.quote_number).toBe("BQ-202604-0001")
    expect(parsed.valid_until).toBeInstanceOf(Date)
  })
})
