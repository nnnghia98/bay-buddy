import { beforeEach, describe, expect, it, vi } from "vitest"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import { convertQuoteToInvoiceAction } from "@/actions/quotes"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

vi.mock("@/lib/api-base", () => ({
  buildApiUrl: (path: string, baseUrl: string) => `${baseUrl}${path}`,
  getServerApiBaseUrl: () => "https://api.example.test",
}))

describe("convertQuoteToInvoiceAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ value: "auth-token" }),
    } as never)
  })

  it("returns an error when the auth cookie is missing", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as never)

    const formData = new FormData()
    formData.set("quote_id", "550e8400-e29b-41d4-a716-446655440010")

    const result = await convertQuoteToInvoiceAction(undefined, formData)

    expect(result.status).toBe("error")
    expect(result.message).toBe("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
    expect(result.invoiceId).toBeNull()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each([401, 403])(
    "returns a permission/session error when the backend responds with %s",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status,
          text: async () =>
            JSON.stringify({
              success: false,
              data: null,
              error:
                status === 401
                  ? "Phiên đăng nhập không hợp lệ."
                  : "Không có quyền thực hiện thao tác này.",
            }),
        }),
      )

      const formData = new FormData()
      formData.set("quote_id", "550e8400-e29b-41d4-a716-446655440010")

      const result = await convertQuoteToInvoiceAction(undefined, formData)

      expect(result.status).toBe("error")
      expect(result.message).toBe(
        status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : "Bạn không có quyền chuyển báo giá này thành hóa đơn.",
      )
      expect(result.invoiceId).toBeNull()
      expect(revalidatePath).not.toHaveBeenCalled()
    },
  )

  it("validates quote and invoice snapshots, then returns the invoice id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            error: null,
            data: {
              quote: {
                id: "550e8400-e29b-41d4-a716-446655440010",
                quote_number: "BQ-202604-0001",
                customer_id: "550e8400-e29b-41d4-a716-446655440001",
                customer_name_snapshot: "Cong ty Bay Buddy",
                customer_address_snapshot: "1 Nguyen Hue",
                customer_tax_code_snapshot: "0312345678",
                total_amount: 1500000,
                tax_amount: 0,
                discount_amount: 0,
                valid_until: "2026-05-01T00:00:00Z",
                status: "ACCEPTED",
                note: "Quote note",
                created_at: "2026-04-23T08:00:00Z",
              },
              invoice: {
                id: "550e8400-e29b-41d4-a716-446655440020",
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
                created_at: "2026-04-23T08:30:00Z",
              },
            },
          }),
      }),
    )

    const formData = new FormData()
    formData.set("quote_id", "550e8400-e29b-41d4-a716-446655440010")

    const result = await convertQuoteToInvoiceAction(undefined, formData)

    expect(result.status).toBe("success")
    expect(result.message).toBe("Đã chuyển báo giá thành hóa đơn.")
    expect(result.invoiceId).toBe("550e8400-e29b-41d4-a716-446655440020")
    expect(revalidatePath).toHaveBeenCalledWith(
      "/quotes/550e8400-e29b-41d4-a716-446655440010",
    )
    expect(revalidatePath).toHaveBeenCalledWith(
      "/invoices/550e8400-e29b-41d4-a716-446655440020",
    )
  })
})
