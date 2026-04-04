/**
 * transaction.ts – Zod schemas for the Transaction domain.
 *
 * Mirrors apps/api/models/transaction.py (TransactionCreate, TransactionRead, TransactionUpdate).
 *
 * Balance update logic (công nợ) – mirrors Python docstring:
 *   CHARGE  → customer.balance += amount   (debt increases)
 *   PAYMENT → customer.balance -= amount   (debt decreases)
 *   REFUND  → customer.balance -= amount   (credit returned)
 */

import { z } from "zod";
import { TransactionTypeSchema } from "./enums";

// ---------------------------------------------------------------------------
// Shared base
// ---------------------------------------------------------------------------

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
   * Determines how Customer.balance (công nợ) is adjusted.
   * Maps to Python: type
   */
  type: TransactionTypeSchema,

  /**
   * Payment method label.
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
  note: z.string().max(500, "Note must be at most 500 characters.").optional(),

  /** Foreign key to the owning Customer. Maps to Python: customer_id */
  customer_id: z.string().uuid("customer_id must be a valid UUID."),

  /** Optional foreign key to the source ticket. Maps to Python: ticket_id */
  ticket_id: z.string().uuid().nullable().optional(),
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
  /** UUID assigned by the backend. Read-only. */
  id: z.string().uuid(),

  /**
   * UTC timestamp auto-stamped by the backend at insert time.
   * Maps to Python: created_at
   * UI should format using vi-VN locale per docs/DICTIONARY.md.
   */
  created_at: z.coerce.date(),
});

export type TransactionRead = z.infer<typeof TransactionReadSchema>;

// ---------------------------------------------------------------------------
// TransactionUpdate – PATCH /transactions/:id (all fields optional)
// Note: `type` and `amount` changes should be rare – prefer a new transaction.
// ---------------------------------------------------------------------------

export const TransactionUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  type: TransactionTypeSchema.optional(),
  method: z.string().min(1).max(100).optional(),
  note: z.string().max(500).optional(),
});

export type TransactionUpdate = z.infer<typeof TransactionUpdateSchema>;
