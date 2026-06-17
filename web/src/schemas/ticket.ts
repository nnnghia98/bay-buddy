/**
 * ticket.ts – Zod schemas for the Ticket domain.
 *
 * Mirrors api/models/ticket.py (TicketCreate, TicketRead, TicketUpdate).
 *
 * Field names from docs/DICTIONARY.md:
 *   pnr           → Mã đặt chỗ (6-char booking reference)
 *   ticket_number → Số vé
 *   departure_place / arrival_place → Nơi đi / nơi đến
 *   departure_code / arrival_code   → Mã nơi đi / mã nơi đến
 *   itinerary     → Hành trình  (e.g. "HAN-SGN")
 *   booked_at     → Ngày xuất vé
 *   net_price     → Giá gốc     (cost paid to airline/supplier)
 *   selling_price → Giá bán     (price invoiced to customer)
 *   discount      → Chiết khấu hãng (airline add-in earned by agency)
 *   ev_price      → Giá net EV (host net price from EV)
 *   ast_price     → Giá AST (host net price from AST)
 *   thf_price     → Giá Thành Hoàng / THF (host net price from Thành Hoàng)
 *   web_price     → Giá WEB (host net price from WEB)
 *   true_income   → Thu nhập thực (selling_price + discount - (ev_price + ast_price + thf_price + web_price))
 *   service_fee   → Phí dịch vụ (computed: selling_price - net_price)
 *
 * Agent parser output (docs/AGENT_PARSER.md) feeds directly into TicketCreateSchema.
 */

import { z } from "zod";
import { calculateServiceFee } from "@/lib/finance-core";
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
  airline: AirlineSchema.nullable().optional(),

  /** Airline ticket number. Maps to Python: ticket_number */
  ticket_number: z.string().min(1).max(50).nullable().optional(),

  /** Human-readable departure place. Maps to Python: departure_place */
  departure_place: z.string().min(1).max(255).nullable().optional(),

  /** Human-readable arrival place. Maps to Python: arrival_place */
  arrival_place: z.string().min(1).max(255).nullable().optional(),

  /** Departure place code. Maps to Python: departure_code */
  departure_code: z.string().min(1).max(10).toUpperCase().nullable().optional(),

  /** Arrival place code. Maps to Python: arrival_code */
  arrival_code: z.string().min(1).max(10).toUpperCase().nullable().optional(),

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
   * This is the flight event time and can be in the past.
   * Maps to Python: flight_date
   */
  flight_date: z.coerce.date(),

  /**
   * Real-world datetime when staff booked the ticket.
   * This is separate from flight_date and system created_at.
   * Maps to Python: booked_at
   */
  booked_at: z.coerce.date().nullable().optional(),

  /**
   * Net cost from airline/supplier – giá gốc.
   * Maps to Python: net_price
   */
  net_price: z
    .number({ message: "Net price (giá gốc) is required." })
    .min(0, "Net price (giá gốc) must be ≥ 0."),

  ev_price: z
    .number({ message: "EV net price (giá net EV) is required." })
    .min(0, "EV net price (giá net EV) must be ≥ 0.")
    .default(0),

  ast_price: z
    .number({ message: "AST net price (giá AST) is required." })
    .min(0, "AST net price (giá AST) must be ≥ 0.")
    .default(0),

  thf_price: z
    .number({ message: "THF price (giá Thành Hoàng) is required." })
    .min(0, "THF price (giá Thành Hoàng) must be ≥ 0.")
    .default(0),

  web_price: z
    .number({ message: "WEB price (giá WEB) is required." })
    .min(0, "WEB price (giá WEB) must be ≥ 0.")
    .default(0),

  selling_price: z
    .number({ message: "Selling price (giá bán) is required." })
    .min(0, "Selling price (giá bán) must be ≥ 0."),

  discount: z
    .number({ message: "Airline discount (chiết khấu hãng) is required." })
    .min(0, "Airline discount (chiết khấu hãng) must be ≥ 0.")
    .default(0),

  true_income: z.number({
    message: "True income (thu nhập thực) is required.",
  }),

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
  (data) =>
    Math.abs(
      data.true_income -
        (data.selling_price +
          data.discount -
          (data.ev_price + data.ast_price + data.thf_price + data.web_price)),
    ) <= 1,
  {
    message:
      "True income (thu nhập thực) must equal selling price + airline discount - EV/AST/THF/WEB net prices.",
    path: ["true_income"],
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

  /** UTC timestamp of when the ticket record was created. */
  created_at: z.coerce.date(),

  /** UTC timestamp of when the ticket record was last updated. */
  updated_at: z.coerce.date(),
});

export type TicketRead = z.infer<typeof TicketReadSchema>;

// ---------------------------------------------------------------------------
// TicketUpdate – PATCH /tickets/:id (all fields optional)
// ---------------------------------------------------------------------------

export const TicketUpdateSchema = z.object({
  pnr: z.string().length(6).toUpperCase().optional(),
  airline: AirlineSchema.optional(),
  ticket_number: z.string().min(1).max(50).optional(),
  passengers: z.array(z.string().min(1).toUpperCase()).min(1).optional(),
  departure_place: z.string().min(1).max(255).optional(),
  arrival_place: z.string().min(1).max(255).optional(),
  departure_code: z.string().min(1).max(10).toUpperCase().optional(),
  arrival_code: z.string().min(1).max(10).toUpperCase().optional(),
  itinerary: z.string().min(1).max(100).optional(),
  flight_date: z.coerce.date().optional(),
  booked_at: z.coerce.date().nullable().optional(),
  net_price: z.number().min(0).optional(),
  ev_price: z.number().min(0).optional(),
  ast_price: z.number().min(0).optional(),
  thf_price: z.number().min(0).optional(),
  web_price: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  true_income: z.number().optional(),
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
): number => calculateServiceFee(net_price, selling_price);

export const computeTrueIncome = (
  selling_price: number,
  discount: number,
  ev_price = 0,
  ast_price = 0,
  thf_price = 0,
  web_price = 0
): number => selling_price + discount - (ev_price + ast_price + thf_price + web_price);
