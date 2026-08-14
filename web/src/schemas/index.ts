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
  CustomerDirectoryPageSchema,
  CustomerReadSchema,
  CustomerUpdateSchema,
  CustomerLedgerSchema,
  LedgerEntrySchema,
  RecordPaymentSchema,
} from "./customer";
export type {
  CustomerCreate,
  CustomerDirectoryItem,
  CustomerDirectoryPage,
  CustomerLedger,
  CustomerRead,
  CustomerUpdate,
  BalanceState,
  LedgerEntry,
  RecordPayment,
} from "./customer";
export { PaginationSchema } from "./pagination";
export type { Pagination } from "./pagination";

// Ticket
export {
  TicketCreateSchema,
  TicketPageSchema,
  TicketReadSchema,
  TicketUpdateSchema,
  computeServiceFee,
} from "./ticket";
export type { TicketCreate, TicketPage, TicketRead, TicketUpdate } from "./ticket";

// Manual debt
export {
  createManualDebtFormSchema,
  createManualDebtRowUpdateSchema,
  getManualDebtValidationMessages,
  getManualDebtRowUpdateValidationMessages,
  initialManualDebtActionState,
  initialManualDebtRowUpdateActionState,
  manualDebtFormSchema,
  manualDebtRowUpdateSchema,
} from "./manual-debt"
export type {
  ManualDebtActionState,
  ManualDebtFormValues,
  ManualDebtRowUpdateActionState,
  ManualDebtRowUpdateFormValues,
  ManualDebtRowUpdateValidationMessages,
  ManualDebtValidationMessages,
} from "./manual-debt"

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
  PaymentMethod,
  RecordPaymentActionState,
  RecordPaymentFormValues,
} from "./finance";

// Transaction
export {
  TransactionCreateSchema,
  TransactionPageSchema,
  TransactionReadSchema,
  TransactionUpdateSchema,
} from "./transaction";
export type {
  TransactionCreate,
  TransactionPage,
  TransactionRead,
  TransactionUpdate,
} from "./transaction";

// Dashboard
export {
  DashboardActionQueueSchema,
  DashboardFinancialSummarySchema,
  DashboardRecentActivitySchema,
  DashboardSummarySchema,
  DashboardTopDebtorSchema,
} from "./dashboard"
export type {
  DashboardActionQueue,
  DashboardFinancialSummary,
  DashboardRecentActivity,
  DashboardSummary,
  DashboardTopDebtor,
} from "./dashboard"
