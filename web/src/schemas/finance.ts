import { z } from "zod"

export const paymentMethodOptions = [
  "Chuyển khoản",
  "Tiền mặt",
  "AST",
  "THF",
] as const

export type PaymentMethod = (typeof paymentMethodOptions)[number]

const defaultRecordPaymentValidationMessages: RecordPaymentValidationMessages = {
  customerIdInvalid: "Mã khách hàng không hợp lệ.",
  amountPositive: "Số tiền phải lớn hơn 0.",
  methodRequired: "Vui lòng chọn loại thanh toán.",
  noteRequired: "Vui lòng nhập ghi chú.",
  noteMax: "Ghi chú không được vượt quá 2000 ký tự.",
  evidenceUrlInvalid: "Ảnh biên lai phải là một đường dẫn hợp lệ.",
  evidenceUrlMax: "Ảnh biên lai không được vượt quá 2048 ký tự.",
  linkedTicketInvalid: "Vé liên kết không hợp lệ.",
}

export type RecordPaymentValidationMessages = {
  customerIdInvalid: string
  amountPositive: string
  methodRequired: string
  noteRequired: string
  noteMax: string
  evidenceUrlInvalid: string
  evidenceUrlMax: string
  linkedTicketInvalid: string
}

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

export function getRecordPaymentValidationMessages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, ...args: any[]) => string,
): RecordPaymentValidationMessages {
  return {
    customerIdInvalid: t(
      "customers.ledger.paymentDialog.validation.customerIdInvalid",
    ),
    amountPositive: t("customers.ledger.paymentDialog.validation.amountPositive"),
    methodRequired: t("customers.ledger.paymentDialog.validation.methodRequired"),
    noteRequired: t("customers.ledger.paymentDialog.validation.noteRequired"),
    noteMax: t("customers.ledger.paymentDialog.validation.noteMax"),
    evidenceUrlInvalid: t(
      "customers.ledger.paymentDialog.validation.evidenceUrlInvalid",
    ),
    evidenceUrlMax: t("customers.ledger.paymentDialog.validation.evidenceUrlMax"),
    linkedTicketInvalid: t(
      "customers.ledger.paymentDialog.validation.linkedTicketInvalid",
    ),
  }
}

export function createRecordPaymentFormSchema(
  messages: RecordPaymentValidationMessages,
) {
  return z.object({
    customer_id: z.string().uuid(messages.customerIdInvalid),
    amount: z.preprocess(
      normalizeAmount,
      z.number().positive(messages.amountPositive),
    ),
    method: z.enum(paymentMethodOptions, {
      message: messages.methodRequired,
    }),
    note: z
      .string()
      .trim()
      .min(1, messages.noteRequired)
      .max(2000, messages.noteMax),
    evidence_url: z.preprocess(
      normalizeOptionalString,
      z
        .string()
        .url(messages.evidenceUrlInvalid)
        .max(2048, messages.evidenceUrlMax)
        .optional(),
    ),
    linked_ticket_id: z.preprocess(
      normalizeOptionalString,
      z.string().uuid(messages.linkedTicketInvalid).optional(),
    ),
  })
}

export const recordPaymentFormSchema = createRecordPaymentFormSchema(
  defaultRecordPaymentValidationMessages,
)

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
