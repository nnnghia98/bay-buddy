import { z } from "zod"

import type { components } from "@/lib/api/generated"

export type WorkbookUpload = components["schemas"]["WorkbookUploadResponse"]
export type WorkbookColumnDataType = "text" | "number" | "date" | "currency"
export type WorkbookColumn = {
  id: string
  field: string
  label: string
  editable: boolean
  semantic_field?: WorkbookSemanticField | null
  origin: "source" | "user"
  data_type: WorkbookColumnDataType
  hidden: boolean
  sticky: boolean
  group_label?: string | null
  header_row_span?: number
}
export type WorkbookSession = components["schemas"]["WorkbookSessionResponse"] & {
  column_config: Array<
    Omit<WorkbookColumn, "field" | "editable" | "group_label" | "header_row_span"> & {
      column_number: number
    }
  >
}
export type WorkbookRecordsPage = Omit<components["schemas"]["WorkbookRecordsPage"], "columns"> & {
  columns: WorkbookColumn[]
}
export type WorkbookCellValue = string | number | boolean | null
export type WorkbookSaveRequest = {
  request_id: string
  base_version: number
  changes: Array<{ row_number: number; values: Record<string, WorkbookCellValue> }>
}
export type WorkbookSaveResponse = components["schemas"]["WorkbookSaveResponse"]
export type WorkbookSemanticField = components["schemas"]["WorkbookSemanticField"]

export const WORKBOOK_MAX_SAFE_VND = 1_000_000_000_000

export const workbookMoneySchema = z
  .number()
  .finite()
  .int()
  .min(0)
  .max(WORKBOOK_MAX_SAFE_VND)

export const workbookPriceValuesSchema = z
  .object({
    net_price: workbookMoneySchema.nullable().optional(),
    selling_price: workbookMoneySchema.nullable().optional(),
  })
  .refine(
    (values) => values.net_price != null || values.selling_price != null,
    "At least one price is required.",
  )

export const workbookPriceChangeSchema = z.object({
  row_number: z.number().int().positive(),
  values: workbookPriceValuesSchema,
})

export const workbookSaveRequestSchema = z.object({
    request_id: z.uuid(),
    base_version: z.number().int().positive(),
    changes: z.array(z.object({
      row_number: z.number().int().positive(),
      values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
    })).min(1).max(500),
  })
  .superRefine((payload, context) => {
    const rows = new Set<number>()
    let changedCells = 0
    payload.changes.forEach((change, index) => {
      if (rows.has(change.row_number)) {
        context.addIssue({
          code: "custom",
          message: "Duplicate workbook rows are not allowed.",
          path: ["changes", index, "row_number"],
        })
      }
      rows.add(change.row_number)
      changedCells += Object.keys(change.values).length
      for (const field of ["net_price", "selling_price"] as const) {
        const value = change.values[field]
        if (value !== undefined && value !== null) {
          const parsed = workbookMoneySchema.safeParse(value)
          if (!parsed.success) {
            context.addIssue({
              code: "custom",
              message: "Price values must be non-negative whole VND amounts.",
              path: ["changes", index, "values", field],
            })
          }
        }
      }
    })
    if (changedCells > 500) {
      context.addIssue({
        code: "custom",
        message: "A save may change at most 500 price cells.",
        path: ["changes"],
      })
    }
  }) satisfies z.ZodType<WorkbookSaveRequest>

export const workbookPriceDraftSchema = z.object({
  row_number: z.number().int().positive(),
  net_price: workbookMoneySchema.optional(),
  selling_price: workbookMoneySchema.optional(),
})

const semanticFieldSchema = z.enum([
  "passenger_name",
  "pnr",
  "ticket_number",
  "net_price",
  "selling_price",
])

const worksheetInspectionSchema = z.object({
  name: z.string(),
  max_row: z.number().int().nonnegative(),
  max_column: z.number().int().nonnegative(),
  header_row_number: z.number().int().positive().nullable().optional(),
  detected_headers: z.array(z.string()),
  column_mapping: z.record(z.string(), z.number().int().positive()),
  mapping_status: z.enum(["READY", "MAPPING_INCOMPLETE", "AMBIGUOUS_MAPPING"]),
  missing_required_fields: z.array(semanticFieldSchema),
  ambiguous_fields: z.record(z.string(), z.array(z.number().int().positive())),
})

export const workbookUploadSchema = z.object({
  id: z.uuid(),
  original_filename: z.string(),
  mime_type: z.string(),
  file_size: z.number().int().nonnegative(),
  checksum: z.string(),
  sheet_count: z.number().int().positive(),
  sheets: z.array(worksheetInspectionSchema),
  created_at: z.iso.datetime(),
}) satisfies z.ZodType<WorkbookUpload>

export const workbookSessionSchema = z.object({
  id: z.uuid(),
  workbook_id: z.uuid(),
  original_filename: z.string(),
  selected_sheet_name: z.string(),
  header_row_number: z.number().int().positive(),
  column_mapping: z.record(z.string(), z.number().int().positive()),
  current_version: z.number().int().positive(),
  status: z.enum(["DRAFT", "COMPLETED", "DISCARDED", "FAILED"]),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  column_config: z.array(z.object({
    id: z.string(), label: z.string(), column_number: z.number().int().positive(),
    origin: z.enum(["source", "user"]), data_type: z.enum(["text", "number", "date", "currency"]),
    hidden: z.boolean(), sticky: z.boolean(), semantic_field: semanticFieldSchema.nullable().optional(),
  })).default([]),
}) satisfies z.ZodType<WorkbookSession>

export const workbookRecordsPageSchema = z.object({
  session_id: z.uuid(),
  version: z.number().int().positive(),
  sheet_name: z.string(),
  header_row_count: z.number().int().min(1).max(2).default(1),
  columns: z.array(
    z.object({
      field: z.string().min(1),
      id: z.string().min(1),
      label: z.string(),
      editable: z.boolean(),
      semantic_field: semanticFieldSchema.nullable().optional(),
      origin: z.enum(["source", "user"]),
      data_type: z.enum(["text", "number", "date", "currency"]),
      hidden: z.boolean().default(false),
      sticky: z.boolean().default(false),
      group_label: z.string().nullable().optional(),
      header_row_span: z.number().int().min(1).max(2).default(1),
    }),
  ),
  items: z.array(
    z.object({
      row_number: z.number().int().positive(),
      values: z.record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()]),
      ),
      editable: z.record(z.string(), z.boolean()),
    }),
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
  }),
}) satisfies z.ZodType<WorkbookRecordsPage>

export const workbookSaveResponseSchema = z.object({
  operation_id: z.uuid(),
  request_id: z.uuid(),
  previous_version: z.number().int().positive(),
  current_version: z.number().int().positive(),
  changed_cells: z.number().int().positive(),
  saved_at: z.iso.datetime(),
}) satisfies z.ZodType<WorkbookSaveResponse>
