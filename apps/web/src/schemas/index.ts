/**
 * apps/web/src/schemas/index.ts
 *
 * Single barrel export for all Bay Buddy Zod schemas.
 * Import from here across the entire frontend:
 *
 *   import { TicketCreateSchema, type TicketRead } from "@/schemas";
 *
 * Import order mirrors apps/api/models/__init__.py dependency order.
 */

// Enums
export {
  AirlineSchema,
  AIRLINE_LABELS,
  CustomerTypeSchema,
  TransactionTypeSchema,
  UserRoleSchema,
} from "./enums";
export type { Airline, CustomerType, TransactionType, UserRole } from "./enums";

// User
export {
  UserCreateSchema,
  UserReadSchema,
  UserUpdateSchema,
} from "./user";
export type { UserCreate, UserRead, UserUpdate } from "./user";

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
