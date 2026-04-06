/**
 * enums.ts – Zod enum schemas for Bay Buddy domain models.
 *
 * Kept in strict sync with apps/api/models/enums.py.
 * Field names follow docs/DICTIONARY.md conventions.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// UserRole
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum(["ADMIN", "STAFF"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

// ---------------------------------------------------------------------------
// CustomerType
// ---------------------------------------------------------------------------

export const CustomerTypeSchema = z.enum(["INDIVIDUAL", "BUSINESS"]);
export type CustomerType = z.infer<typeof CustomerTypeSchema>;

// ---------------------------------------------------------------------------
// Airline
// Supported Vietnamese carriers mapped to their IATA-style codes.
// VNA = Vietnam Airlines, VJ = Vietjet Air, QH = Bamboo Airways, VU = Vietravel Airlines
// ---------------------------------------------------------------------------

export const AirlineSchema = z.enum(["VNA", "VJ", "QH", "VU"]);
export type Airline = z.infer<typeof AirlineSchema>;

/** Human-readable labels for UI dropdowns – keyed by Airline code. */
export const AIRLINE_LABELS: Record<Airline, string> = {
  VNA: "Vietnam Airlines",
  VJ: "Vietjet Air",
  QH: "Bamboo Airways",
  VU: "Vietravel Airlines",
};

// ---------------------------------------------------------------------------
// TransactionType
// ---------------------------------------------------------------------------

export const TransactionTypeSchema = z.enum(["PAYMENT", "CHARGE", "REFUND"]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

// ---------------------------------------------------------------------------
// TransactionCategory
// ---------------------------------------------------------------------------

export const TransactionCategorySchema = z.enum([
  "TICKET_PURCHASE",
  "PAYMENT",
  "DISCOUNT",
  "ADDITIONAL_FEE",
  "REFUND",
]);
export type TransactionCategory = z.infer<typeof TransactionCategorySchema>;

// ---------------------------------------------------------------------------
// TicketStatus
// ---------------------------------------------------------------------------

export const TicketStatusSchema = z.enum(["DRAFT", "CONFIRMED", "VOID", "REFUNDED"]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;
