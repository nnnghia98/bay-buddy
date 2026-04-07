import { z } from "zod"

const paymentMethods = ["Chuyển khoản", "Tiền mặt"] as const

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue : undefined
}

function normalizeAmount(value: unknown): number {
  if (typeof value === "number") {
    return value
  }

  if (typeof value !== "string") {
    return Number.NaN
  }

  const digitsOnly = value.replace(/[^\d]/g, "")
  return Number(digitsOnly)
}

export const recordPaymentFormSchema = z.object({
  customer_id: z.string().uuid("Mã khách hàng không hợp lệ."),
  amount: z
    .preprocess(normalizeAmount, z.number().positive("Số tiền phải lớn hơn 0.")),
  method: z.enum(paymentMethods, {
    message: "Vui lòng chọn loại thanh toán.",
  }),
  note: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập ghi chú.")
    .max(2000, "Ghi chú không được vượt quá 2000 ký tự."),
  evidence_url: z
    .preprocess(
      normalizeOptionalString,
      z
        .string()
        .url("Ảnh biên lai phải là một đường dẫn hợp lệ.")
        .max(2048, "Ảnh biên lai không được vượt quá 2048 ký tự.")
        .optional(),
    ),
  linked_ticket_id: z.preprocess(
    normalizeOptionalString,
    z.string().uuid("Vé liên kết không hợp lệ.").optional(),
  ),
})

export type RecordPaymentFormValues = z.infer<typeof recordPaymentFormSchema>

export type RecordPaymentActionState = {
  status: "idle" | "success" | "error"
  message: string | null
  fieldErrors: Partial<Record<keyof RecordPaymentFormValues, string>>
  submittedAt: number | null
  transactionId: string | null
}

export const initialRecordPaymentActionState: RecordPaymentActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  submittedAt: null,
  transactionId: null,
}

export const paymentMethodOptions = paymentMethods
