import { z } from "zod"

import { TransactionCategorySchema } from "./enums"

export const DashboardFinancialSummarySchema = z.object({
  total_ticket_sales: z.number().nonnegative(),
  total_true_income: z.number(),
  total_receivables: z.number().nonnegative(),
  total_held_credit: z.number().nonnegative(),
  confirmed_tickets: z.number().int().nonnegative(),
  customers_with_debt: z.number().int().nonnegative(),
  customers_with_credit: z.number().int().nonnegative(),
  income_rate_percent: z.number(),
})

export const DashboardTopDebtorSchema = z.object({
  customer_id: z.string().uuid(),
  customer_name: z.string().min(1),
  outstanding_balance: z.number().positive(),
})

export const DashboardActionQueueSchema = z.object({
  key: z.enum(["receivables", "heldCredit", "draftTickets"]),
  count: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
})

export const DashboardRecentActivitySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["ticket", "payment", "adjustment", "refund"]),
  category: TransactionCategorySchema.nullable().optional(),
  customer_id: z.string().uuid(),
  customer_name: z.string().min(1),
  title: z.string(),
  amount: z.number(),
  created_at: z.coerce.date(),
})

export const DashboardSummarySchema = z.object({
  financial: DashboardFinancialSummarySchema,
  top_debtors: z.array(DashboardTopDebtorSchema),
  action_queues: z.array(DashboardActionQueueSchema),
  recent_activity: z.array(DashboardRecentActivitySchema),
  scope_started_at: z.coerce.date().nullable(),
  updated_at: z.coerce.date(),
})

export type DashboardFinancialSummary = z.infer<
  typeof DashboardFinancialSummarySchema
>
export type DashboardTopDebtor = z.infer<typeof DashboardTopDebtorSchema>
export type DashboardActionQueue = z.infer<typeof DashboardActionQueueSchema>
export type DashboardRecentActivity = z.infer<
  typeof DashboardRecentActivitySchema
>
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>
