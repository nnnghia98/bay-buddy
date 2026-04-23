import { beforeEach, describe, expect, it, vi } from "vitest"

import { recordPaymentAction } from "@/actions/finance"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

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

describe("recordPaymentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(cookies).mockResolvedValue({
      get: () => ({ value: "auth-token" }),
    } as never)
  })

  it("returns an error when the backend payload does not validate as a transaction", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: {
              transaction: {
                id: "not-a-uuid",
              },
              customer_new_balance: 900_000,
              balance_state: "debt",
            },
          }),
      }),
    )

    const formData = new FormData()
    formData.set("customer_id", "550e8400-e29b-41d4-a716-446655440000")
    formData.set("amount", "300000")
    formData.set("method", "Chuyển khoản")
    formData.set("note", "Partial payment")

    const result = await recordPaymentAction(undefined, formData)

    expect(result.status).toBe("error")
    expect(result.message).toBe("Không thể ghi nhận thanh toán lúc này.")
    expect(result.transactionId).toBeNull()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
