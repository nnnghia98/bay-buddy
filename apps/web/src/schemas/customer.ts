/**
 * customer.ts – Zod schemas for the Customer domain.
 *
 * Mirrors apps/api/models/customer.py (CustomerCreate, CustomerRead, CustomerUpdate).
 *
 * Balance semantics (công nợ) – from docs/DICTIONARY.md:
 *   balance > 0  →  Customer owes money  (debt)
 *   balance < 0  →  Customer has credit  (over-paid)
 *   balance === 0 → Settled
 */

import { z } from "zod";
import { CustomerTypeSchema } from "./enums";

// ---------------------------------------------------------------------------
// Shared base
// ---------------------------------------------------------------------------

const CustomerBaseSchema = z.object({
  /** Full name of the individual or registered business. Maps to Python: name */
  name: z
    .string()
    .min(1, "Name is required.")
    .max(255, "Name must be at most 255 characters."),

  /** Account category. Maps to Python: type */
  type: CustomerTypeSchema.default("INDIVIDUAL"),

  /**
   * Current debt balance (công nợ).
   * Positive = customer owes; Negative = customer has credit.
   * Maps to Python: balance
   */
  balance: z.number().default(0),
});

// ---------------------------------------------------------------------------
// CustomerCreate – POST /customers
// ---------------------------------------------------------------------------

export const CustomerCreateSchema = CustomerBaseSchema;
export type CustomerCreate = z.infer<typeof CustomerCreateSchema>;

// ---------------------------------------------------------------------------
// CustomerRead – GET /customers/:id
// ---------------------------------------------------------------------------

export const CustomerReadSchema = CustomerBaseSchema.extend({
  /** UUID assigned by the backend. Read-only on the frontend. */
  id: z.string().uuid(),
});

export type CustomerRead = z.infer<typeof CustomerReadSchema>;

// ---------------------------------------------------------------------------
// CustomerUpdate – PATCH /customers/:id (all fields optional)
// ---------------------------------------------------------------------------

export const CustomerUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required.")
    .max(255, "Name must be at most 255 characters.")
    .optional(),

  type: CustomerTypeSchema.optional(),

  /** Direct balance override – normally mutated via Transactions only. */
  balance: z.number().optional(),
});

export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>;

export const LedgerEntrySchema = z.object({
  id: z.string().uuid(),
  entry_type: z.enum(["ticket", "payment", "adjustment"]),
  created_at: z.coerce.date(),
  content: z.string(),
  amount: z.number(),
  running_balance: z.number(),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const CustomerLedgerSchema = z.object({
  customer: CustomerReadSchema,
  current_balance: z.number(),
  entries: z.array(LedgerEntrySchema),
});

export type CustomerLedger = z.infer<typeof CustomerLedgerSchema>;

export const RecordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be a positive number."),
  note: z.string().max(500, "Note must be at most 500 characters.").optional(),
});

export type RecordPayment = z.infer<typeof RecordPaymentSchema>;

export const CustomerDirectoryItemSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  phone: z.string().nullable().optional(),
  current_balance: z.number(),
});

export type CustomerDirectoryItem = z.infer<typeof CustomerDirectoryItemSchema>;
