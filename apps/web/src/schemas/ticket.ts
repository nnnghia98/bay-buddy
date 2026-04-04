/**
 * ticket.ts – Zod schemas for the Ticket domain.
 *
 * Mirrors apps/api/models/ticket.py (TicketCreate, TicketRead, TicketUpdate).
 *
 * Field names from docs/DICTIONARY.md:
 *   pnr           → Mã đặt chỗ (6-char booking reference)
 *   itinerary     → Hành trình  (e.g. "HAN-SGN")
 *   net_price     → Giá gốc     (cost paid to airline/supplier)
 *   selling_price → Giá bán     (price invoiced to customer)
 *   service_fee   → Phí dịch vụ (computed: selling_price - net_price)
 *
 * Agent parser output (docs/AGENT_PARSER.md) feeds directly into TicketCreateSchema.
 */

import { z } from "zod";
import { AirlineSchema, TicketStatusSchema } from "./enums";

// ---------------------------------------------------------------------------
// Shared base – fields common to all ticket schema variants
// ---------------------------------------------------------------------------

const TicketBaseSchema = z.object({
  /**
   * Mã đặt chỗ – 6-character alphanumeric PNR booking reference.
   * Maps to Python: pnr
   */
  pnr: z
    .string()
    .length(6, "PNR (mã đặt chỗ) must be exactly 6 characters.")
    .toUpperCase(),

  /** Airline carrier code. Maps to Python: airline */
  airline: AirlineSchema,

  /**
   * Flight route string (hành trình).
   * Maps to Python: itinerary
   * Example: "HAN-SGN" or "SGN-DAD-HAN"
   */
  itinerary: z
    .string()
    .min(1, "Itinerary (hành trình) is required.")
    .max(100),

  /**
   * Scheduled departure datetime in ISO-8601 format.
   * The API stores UTC; UI displays in DD/MM/YYYY per docs/DICTIONARY.md.
   * Maps to Python: flight_date
   */
  flight_date: z.coerce.date(),

  /**
   * Net cost from airline/supplier – giá gốc.
   * Maps to Python: net_price
   */
  net_price: z
    .number({ message: "Net price (giá gốc) is required." })
    .min(0, "Net price (giá gốc) must be ≥ 0."),

  selling_price: z
    .number({ message: "Selling price (giá bán) is required." })
    .min(0, "Selling price (giá bán) must be ≥ 0."),

  /** Lifecycle state of the ticket. Maps to Python: status */
  status: TicketStatusSchema.default("DRAFT"),

  /** Foreign key to the owning Customer. Maps to Python: customer_id */
  customer_id: z.string().uuid("customer_id must be a valid UUID."),
});

// ---------------------------------------------------------------------------
// TicketCreate – POST /tickets
// Aligns 1-to-1 with the JSON returned by the Gemini AI parser.
// ---------------------------------------------------------------------------

export const TicketCreateSchema = TicketBaseSchema.extend({
  /**
   * List of passenger full names in UPPERCASE.
   * At least one passenger is required.
   * Maps to Python: passengers (JSON column)
   */
  passengers: z
    .array(z.string().min(1).toUpperCase())
    .min(1, "At least one passenger is required."),
}).refine(
  (data) => data.selling_price >= data.net_price,
  {
    message:
      "Selling price (giá bán) should be ≥ net price (giá gốc). Verify before saving.",
    path: ["selling_price"],
  }
);

export type TicketCreate = z.infer<typeof TicketCreateSchema>;

// ---------------------------------------------------------------------------
// TicketRead – GET /tickets/:id
// ---------------------------------------------------------------------------

export const TicketReadSchema = TicketBaseSchema.extend({
  /** UUID assigned by the backend. Read-only. */
  id: z.string().uuid(),

  passengers: z.array(z.string()),

  /**
   * Computed on the backend: selling_price - net_price.
   * Phí dịch vụ – not stored in the DB.
   * Maps to Python: service_fee (property)
   */
  service_fee: z.number(),
});

export type TicketRead = z.infer<typeof TicketReadSchema>;

// ---------------------------------------------------------------------------
// TicketUpdate – PATCH /tickets/:id (all fields optional)
// ---------------------------------------------------------------------------

export const TicketUpdateSchema = z.object({
  pnr: z.string().length(6).toUpperCase().optional(),
  airline: AirlineSchema.optional(),
  passengers: z.array(z.string().min(1).toUpperCase()).min(1).optional(),
  itinerary: z.string().min(1).max(100).optional(),
  flight_date: z.coerce.date().optional(),
  net_price: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  status: TicketStatusSchema.optional(),
  customer_id: z.string().uuid().optional(),
});

export type TicketUpdate = z.infer<typeof TicketUpdateSchema>;

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** Compute phí dịch vụ (service fee) client-side for optimistic UI. */
export const computeServiceFee = (
  net_price: number,
  selling_price: number
): number => selling_price - net_price;
