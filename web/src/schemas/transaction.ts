/**
 * transaction.ts – Zod schemas for the Transaction domain.
 *
 * Mirrors api/models/transaction.py (TransactionCreate, TransactionRead, TransactionUpdate).
 *
 * Balance update logic (công nợ) – derived from `category`:
 *   TICKET_PURCHASE / ADDITIONAL_FEE / REFUND → customer.balance += amount
 *   PAYMENT / DISCOUNT                        → customer.balance -= amount
 */

import { z } from "zod";
import { TransactionCategorySchema, TransactionTypeSchema } from "./enums";

// ---------------------------------------------------------------------------
// Shared base
// ---------------------------------------------------------------------------

const NullableEvidenceUrlSchema = z
  .string()
  .url("evidence_url must be a valid URL.")
  .max(2048)
  .nullable()
  .optional();

const TransactionBaseSchema = z.object({
  /**
   * Transaction amount. Must be positive; direction is encoded in `type`.
   * Maps to Python: amount
   */
  amount: z
    .number({ message: "Amount is required." })
    .positive("Amount must be a positive number."),

  /**
   * PAYMENT | CHARGE | REFUND.
   * Legacy direction enum kept in sync with category.
   * Maps to Python: type
   */
  type: TransactionTypeSchema,

  /**
   * VN-market transaction category for reconciliation and running balance rules.
   * Maps to Python: category
   */
  category: TransactionCategorySchema.default("TICKET_PURCHASE"),

  /**
   * Payment method label for manually created transactions.
   * Maps to Python: method
   * Examples: "Bank Transfer", "Cash", "Momo"
   */
  method: z
    .string()
    .min(1, "Payment method is required.")
    .max(100, "Method must be at most 100 characters."),

  /**
   * Optional free-text note or reference number.
   * Maps to Python: note
   */
  note: z
    .string()
    .max(2000, "Note must be at most 2000 characters.")
    .nullable()
    .optional(),

  /**
   * Optional receipt URL or payment-proof link.
   * Maps to Python: evidence_url
   */
  evidence_url: NullableEvidenceUrlSchema,

  /** Foreign key to the owning Customer. Maps to Python: customer_id */
  customer_id: z.string().uuid("customer_id must be a valid UUID."),

  /** Optional foreign key to the specifically reconciled ticket. Maps to Python: linked_ticket_id */
  linked_ticket_id: z.string().uuid().nullable().optional(),

  /** Refund confirmation state for overpayment returns. Maps to Python: is_refunded_confirmed */
  is_refund_confirmed: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// TransactionCreate – POST /transactions
// ---------------------------------------------------------------------------

export const TransactionCreateSchema = TransactionBaseSchema;
export type TransactionCreate = z.infer<typeof TransactionCreateSchema>;

// ---------------------------------------------------------------------------
// TransactionRead – GET /transactions/:id
// ---------------------------------------------------------------------------

export const TransactionReadSchema = TransactionBaseSchema.extend({
  /**
   * Ticket debt rows may have no payment method until a payment is recorded.
   */
  method: z
    .string()
    .min(1, "Payment method must not be empty.")
    .max(100, "Method must be at most 100 characters.")
    .nullable(),

  /** UUID assigned by the backend. Read-only. */
  id: z.string().uuid(),

  /**
   * UTC timestamp auto-stamped by the backend at insert time.
   * Maps to Python: created_at
   * UI should format using vi-VN locale per docs/DICTIONARY.md.
   */
  created_at: z.coerce.date(),

  /** Business event timestamp used for ledger ordering and correction forms. */
  occurred_at: z.coerce.date(),

  /** UUID of the authenticated internal user who created the transaction. */
  created_by: z.string().uuid(),
});

export type TransactionRead = z.infer<typeof TransactionReadSchema>;

// ---------------------------------------------------------------------------
// TransactionUpdate – PATCH /transactions/:id (all fields optional)
// Note: `type` and `amount` changes should be rare – prefer a new transaction.
// ---------------------------------------------------------------------------

export const TransactionUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  type: TransactionTypeSchema.optional(),
  category: TransactionCategorySchema.optional(),
  method: z.string().min(1).max(100).optional(),
  note: z.string().max(2000).nullable().optional(),
  evidence_url: z.string().url().max(2048).nullable().optional(),
  occurred_at: z.coerce.date().optional(),
  linked_ticket_id: z.string().uuid().nullable().optional(),
  is_refund_confirmed: z.boolean().optional(),
});

export type TransactionUpdate = z.infer<typeof TransactionUpdateSchema>;
