/**
 * web/src/schemas/index.ts
 *
 * Single barrel export for all Bay Buddy Zod schemas.
 * Import from here across the entire frontend:
 *
 *   import { TicketCreateSchema, type TicketRead } from "@/schemas";
 *
 * Import order mirrors api/models/__init__.py dependency order.
 */

// Enums
export {
  AirlineSchema,
  AIRLINE_LABELS,
  CustomerTypeSchema,
  TransactionCategorySchema,
  TransactionTypeSchema,
  UserRoleSchema,
} from "./enums";
export type {
  Airline,
  CustomerType,
  TransactionCategory,
  TransactionType,
  UserRole,
} from "./enums";

// User
export {
  UserCreateSchema,
  UserReadSchema,
  UserUpdateSchema,
} from "./user";
export type { UserCreate, UserRead, UserUpdate } from "./user";
export {
  createUserFormSchema,
  createCreateUserFormSchema,
  createToggleUserActiveFormSchema,
  createUpdateUserFormSchema,
  getSettingsUserValidationMessages,
  updateUserFormSchema,
  toggleUserActiveFormSchema,
  initialSettingsUserActionState,
} from "./settings-users"
export type {
  CreateUserFormValues,
  SettingsUserActionField,
  SettingsUserValidationMessages,
  ToggleUserActiveFormValues,
  UpdateUserFormValues,
  SettingsUserActionState,
} from "./settings-users"
export {
  createToggleCustomerActiveFormSchema,
  createUpdateCustomerFormSchema,
  getCustomerManagementValidationMessages,
  initialCustomerManagementActionState,
  toggleCustomerActiveFormSchema,
  updateCustomerFormSchema,
} from "./customer-management"
export type {
  CustomerManagementActionState,
  CustomerManagementField,
  CustomerManagementValidationMessages,
  CustomerToggleActiveFormValues,
  CustomerUpdateFormValues,
} from "./customer-management"

// Customer
export {
  CustomerCreateSchema,
  CustomerDirectoryItemSchema,
  CustomerReadSchema,
  CustomerUpdateSchema,
  CustomerLedgerSchema,
  LedgerEntrySchema,
  RecordPaymentSchema,
} from "./customer";
export type {
  CustomerCreate,
  CustomerDirectoryItem,
  CustomerLedger,
  CustomerRead,
  CustomerUpdate,
  BalanceState,
  LedgerEntry,
  RecordPayment,
} from "./customer";

// Ticket
export {
  TicketCreateSchema,
  TicketReadSchema,
  TicketUpdateSchema,
  computeServiceFee,
} from "./ticket";
export type { TicketCreate, TicketRead, TicketUpdate } from "./ticket";

// Finance
export {
  CustomerInvoiceListSchema,
  InvoiceDetailSchema,
  InvoiceItemSchema,
  InvoiceListItemSchema,
  InvoicePublicBrandSchema,
  InvoicePublicViewSchema,
  InvoiceReadSchema,
  InvoiceStatusSchema,
  QuoteConvertResponseSchema,
  QuoteDetailSchema,
  QuoteItemSchema,
  QuoteReadSchema,
  QuoteStatusSchema,
} from "./finance-documents";
export type {
  CustomerInvoiceList,
  InvoiceDetail,
  InvoiceItem,
  InvoiceListItem,
  InvoicePublicBrand,
  InvoicePublicView,
  InvoiceRead,
  InvoiceStatus,
  QuoteConvertResponse,
  QuoteDetail,
  QuoteItem,
  QuoteRead,
  QuoteStatus,
} from "./finance-documents";
export {
  initialRecordPaymentActionState,
  paymentMethodOptions,
  recordPaymentFormSchema,
} from "./finance";
export type {
  RecordPaymentActionState,
  RecordPaymentFormValues,
} from "./finance";

// Transaction
export {
  TransactionCreateSchema,
  TransactionReadSchema,
  TransactionUpdateSchema,
} from "./transaction";
export type {
  TransactionCreate,
  TransactionRead,
  TransactionUpdate,
} from "./transaction";
