import { z } from "zod"

import { CustomerTypeSchema } from "./enums"

export type CustomerManagementValidationMessages = {
  customerIdInvalid: string
  nameRequired: string
  nameMax: string
  emailInvalid: string
  emailMax: string
  phoneMax: string
  addressMax: string
  taxCodeMax: string
  typeRequired: string
  statusRequired: string
}

const defaultCustomerManagementValidationMessages: CustomerManagementValidationMessages = {
  customerIdInvalid: "Mã khách hàng không hợp lệ.",
  nameRequired: "Vui lòng nhập tên khách hàng.",
  nameMax: "Tên khách hàng không được vượt quá 255 ký tự.",
  emailInvalid: "Email khách hàng không hợp lệ.",
  emailMax: "Email không được vượt quá 255 ký tự.",
  phoneMax: "Số điện thoại không được vượt quá 30 ký tự.",
  addressMax: "Địa chỉ không được vượt quá 500 ký tự.",
  taxCodeMax: "Mã số thuế không được vượt quá 100 ký tự.",
  typeRequired: "Vui lòng chọn loại khách hàng.",
  statusRequired: "Vui lòng chọn trạng thái khách hàng.",
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue : null
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value !== "string") {
    return undefined
  }

  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return undefined
}

export function getCustomerManagementValidationMessages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, ...args: any[]) => string,
): CustomerManagementValidationMessages {
  return {
    customerIdInvalid: t("customers.management.validation.customerIdInvalid"),
    nameRequired: t("customers.management.validation.nameRequired"),
    nameMax: t("customers.management.validation.nameMax"),
    emailInvalid: t("customers.management.validation.emailInvalid"),
    emailMax: t("customers.management.validation.emailMax"),
    phoneMax: t("customers.management.validation.phoneMax"),
    addressMax: t("customers.management.validation.addressMax"),
    taxCodeMax: t("customers.management.validation.taxCodeMax"),
    typeRequired: t("customers.management.validation.typeRequired"),
    statusRequired: t("customers.management.validation.statusRequired"),
  }
}

export function createUpdateCustomerFormSchema(
  messages: CustomerManagementValidationMessages,
) {
  return z.object({
    customer_id: z.string().uuid(messages.customerIdInvalid),
    name: z
      .string()
      .trim()
      .min(1, messages.nameRequired)
      .max(255, messages.nameMax),
    type: CustomerTypeSchema,
    is_active: z.preprocess(
      normalizeBoolean,
      z.boolean({ message: messages.statusRequired }),
    ),
    email: z.preprocess(
      normalizeOptionalString,
      z.string().email(messages.emailInvalid).max(255, messages.emailMax).nullable(),
    ),
    phone: z.preprocess(
      normalizeOptionalString,
      z.string().max(30, messages.phoneMax).nullable(),
    ),
    address: z.preprocess(
      normalizeOptionalString,
      z.string().max(500, messages.addressMax).nullable(),
    ),
    tax_code: z.preprocess(
      normalizeOptionalString,
      z.string().max(100, messages.taxCodeMax).nullable(),
    ),
  })
}

export function createToggleCustomerActiveFormSchema(
  messages: CustomerManagementValidationMessages,
) {
  return z.object({
    customer_id: z.string().uuid(messages.customerIdInvalid),
    is_active: z.preprocess(
      normalizeBoolean,
      z.boolean({ message: messages.statusRequired }),
    ),
  })
}

export const updateCustomerFormSchema = createUpdateCustomerFormSchema(
  defaultCustomerManagementValidationMessages,
)
export const toggleCustomerActiveFormSchema = createToggleCustomerActiveFormSchema(
  defaultCustomerManagementValidationMessages,
)

export type CustomerUpdateFormValues = z.infer<typeof updateCustomerFormSchema>
export type CustomerToggleActiveFormValues = z.infer<
  typeof toggleCustomerActiveFormSchema
>

export type CustomerManagementField =
  | "customer_id"
  | "name"
  | "type"
  | "is_active"
  | "email"
  | "phone"
  | "address"
  | "tax_code"

export type CustomerManagementActionState = {
  status: "idle" | "success" | "error"
  message: string | null
  fieldErrors: Partial<Record<CustomerManagementField, string>>
  submittedAt: number | null
  customerId: string | null
}

export const initialCustomerManagementActionState: CustomerManagementActionState =
  {
    status: "idle",
    message: null,
    fieldErrors: {},
    submittedAt: null,
    customerId: null,
  }
