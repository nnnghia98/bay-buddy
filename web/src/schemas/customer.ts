/**
 * customer.ts – Zod schemas for the Customer domain.
 *
 * Mirrors api/models/customer.py (CustomerCreate, CustomerRead, CustomerUpdate).
 *
 * Balance semantics (công nợ) – from docs/DICTIONARY.md:
 *   balance > 0  →  Customer owes money  (debt)
 *   balance < 0  →  Customer has credit  (over-paid)
 *   balance === 0 → Settled
 */

import { z } from "zod";
import { CustomerTypeSchema } from "./enums";
import { TicketReadSchema } from "./ticket";
import { TransactionReadSchema } from "./transaction";

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

  /** Soft-archive flag. Archived customers remain in history. */
  is_active: z.boolean().default(true),

  /** Optional customer email used for billing and contact. */
  email: z.string().email().max(255).nullable().optional(),

  /** Optional customer phone number. */
  phone: z.string().max(30).nullable().optional(),

  /** Optional billing address. */
  address: z.string().max(500).nullable().optional(),

  /** Optional tax code for invoice issuance. */
  tax_code: z.string().max(100).nullable().optional(),
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

  is_active: z.boolean().optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  tax_code: z.string().max(100).nullable().optional(),
});

export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>;

export const BalanceStateSchema = z.enum(["debt", "settled", "credit"]);
export type BalanceState = z.infer<typeof BalanceStateSchema>;

export const LedgerEntrySchema = z.object({
  id: z.string().uuid(),
  entry_type: z.enum(["ticket", "payment", "adjustment"]),
  created_at: z.coerce.date(),
  content: z.string(),
  amount: z.number(),
  running_balance: z.number(),
  ticket: TicketReadSchema.nullable().optional(),
  transaction: TransactionReadSchema.nullable().optional(),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const CustomerLedgerSchema = z.object({
  customer: CustomerReadSchema,
  current_balance: z.number(),
  balance_state: BalanceStateSchema,
  entries: z.array(LedgerEntrySchema),
});

export type CustomerLedger = z.infer<typeof CustomerLedgerSchema>;

export const RecordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be a positive number."),
  method: z.string().min(1, "Method is required."),
  note: z.string().min(1, "Note is required.").max(2000, "Note must be at most 2000 characters."),
  evidence_url: z
    .string()
    .url("evidence_url must be a valid URL.")
    .max(2048)
    .nullable()
    .optional(),
  linked_ticket_id: z.string().uuid().optional(),
});

export type RecordPayment = z.infer<typeof RecordPaymentSchema>;

export const CustomerDirectoryItemSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  phone: z.string().nullable().optional(),
  current_balance: z.number(),
  is_active: z.boolean().default(true),
});

export type CustomerDirectoryItem = z.infer<typeof CustomerDirectoryItemSchema>;
