import { z } from "zod"

import type { components } from "@/lib/api/generated"

export type WorkbookSemanticField = components["schemas"]["WorkbookSemanticField"]
export type WorkbookMappingStatus = components["schemas"]["WorkbookMappingStatus"]
export type WorksheetInspection = components["schemas"]["WorksheetInspectionResponse"]
export type WorkbookUpload = Omit<
  components["schemas"]["WorkbookUploadResponse"],
  "sheets"
> & { sheets: WorksheetInspection[] }
export type WorkbookColumnDataType = components["schemas"]["WorkbookColumnDataType"]
export type WorkbookColumnFormula = components["schemas"]["WorkbookColumnFormula-Input"]
export type WorkbookFormulaExpression = WorkbookColumnFormula["expression"]
export type WorkbookFormulaOperator = components["schemas"]["WorkbookFormulaOperator"]
export type WorkbookComparisonOperator = components["schemas"]["WorkbookComparisonOperator"]
export type WorkbookVariadicFunction = components["schemas"]["WorkbookVariadicFunction"]
export type WorkbookFormulaPreviewRequest = components["schemas"]["WorkbookFormulaPreviewRequest"]
export type WorkbookFormulaPreviewResponse = components["schemas"]["WorkbookFormulaPreviewResponse"]
export type WorkbookUpdateColumnRequest = components["schemas"]["WorkbookUpdateColumnRequest"]
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
  formula?: WorkbookColumnFormula | null
  number_format?: string | null
}
export type WorkbookSession = Omit<components["schemas"]["WorkbookSessionResponse"], "column_config"> & {
  column_config: Array<
    Omit<WorkbookColumn, "field" | "editable" | "group_label" | "header_row_span"> & {
      column_number: number
    }
  >
}
export type WorkbookSessionSummary = components["schemas"]["WorkbookSessionSummary"]
export type WorkbookSessionList = components["schemas"]["WorkbookSessionListResponse"]
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
export type WorkbookCellValueLookupRequest = {
  base_version: number
  cells: Array<{ row_number: number; column_id: string }>
}
export type WorkbookCellValueLookupResponse = {
  session_id: string
  version: number
  cells: Array<{ row_number: number; column_id: string; value: WorkbookCellValue }>
}

export const WORKBOOK_MAX_SAFE_VND = 1_000_000_000_000
export const WORKBOOK_MAX_TEXT_LENGTH = 32_767
export const WORKBOOK_FORMULA_MAX_DEPTH = 12
export const WORKBOOK_FORMULA_MAX_NODES = 128
export const WORKBOOK_FORMULA_MAX_ARGUMENTS = 20

const formulaConstantSchema = z.object({
  type: z.literal("constant"),
  value: z.string().min(1).max(100).regex(/^-?(?:\d+\.?\d*|\.\d+)$/),
})
const formulaColumnSchema = z.object({
  type: z.literal("column"),
  column_id: z.string().min(1).max(64),
})

export const workbookFormulaExpressionSchema: z.ZodType<WorkbookFormulaExpression> = z.lazy(() =>
  z.discriminatedUnion("type", [
    formulaConstantSchema,
    formulaColumnSchema,
    z.object({
      type: z.literal("binary"),
      operator: z.enum(["+", "-", "*", "/"]),
      left: workbookFormulaExpressionSchema,
      right: workbookFormulaExpressionSchema,
    }),
    z.object({
      type: z.literal("comparison"),
      operator: z.enum(["=", "<>", "<", "<=", ">", ">="]),
      left: workbookFormulaExpressionSchema,
      right: workbookFormulaExpressionSchema,
    }),
    z.object({
      type: z.literal("if"),
      condition: workbookFormulaExpressionSchema,
      when_true: workbookFormulaExpressionSchema,
      when_false: workbookFormulaExpressionSchema,
    }),
    z.object({
      type: z.literal("round"),
      value: workbookFormulaExpressionSchema,
      digits: z.number().int().min(-15).max(15),
    }),
    z.object({
      type: z.literal("function"),
      function: z.enum(["SUM", "MIN", "MAX"]),
      arguments: z.array(workbookFormulaExpressionSchema).min(1).max(WORKBOOK_FORMULA_MAX_ARGUMENTS),
    }),
  ]),
)

function formulaComplexity(expression: WorkbookFormulaExpression): { depth: number; nodes: number } {
  if (expression.type === "constant" || expression.type === "column") return { depth: 1, nodes: 1 }
  const children = expression.type === "binary" || expression.type === "comparison"
    ? [expression.left, expression.right]
    : expression.type === "if"
      ? [expression.condition, expression.when_true, expression.when_false]
      : expression.type === "round"
        ? [expression.value]
        : expression.arguments
  const metrics = children.map(formulaComplexity)
  return {
    depth: 1 + Math.max(...metrics.map((metric) => metric.depth)),
    nodes: 1 + metrics.reduce((total, metric) => total + metric.nodes, 0),
  }
}

export const workbookColumnFormulaSchema = z.object({
  schema_version: z.literal(1),
  expression: workbookFormulaExpressionSchema,
}).superRefine((formula, context) => {
  const metrics = formulaComplexity(formula.expression)
  if (metrics.depth > WORKBOOK_FORMULA_MAX_DEPTH) {
    context.addIssue({ code: "custom", message: "Formula is too deeply nested.", path: ["expression"] })
  }
  if (metrics.nodes > WORKBOOK_FORMULA_MAX_NODES) {
    context.addIssue({ code: "custom", message: "Formula contains too many nodes.", path: ["expression"] })
  }
}) satisfies z.ZodType<WorkbookColumnFormula>

const workbookFormulaErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).default({}),
})

export const workbookFormulaPreviewRequestSchema = z.object({
  base_version: z.number().int().positive(),
  formula: workbookColumnFormulaSchema,
  output_type: z.enum(["number", "currency"]),
  output_column_id: z.string().min(1).max(64).nullable().optional(),
  sample_rows: z.array(z.number().int().positive()).min(1).max(10).nullable().optional(),
}) satisfies z.ZodType<WorkbookFormulaPreviewRequest>

export const workbookFormulaPreviewResponseSchema = z.object({
  valid: z.boolean(),
  normalized_formula: workbookColumnFormulaSchema.nullable().optional(),
  readable_expression: z.string().nullable().optional(),
  referenced_column_ids: z.array(z.string()).default([]),
  results: z.array(z.object({
    row_number: z.number().int().positive(),
    value: z.number().finite().nullable().optional(),
    error_code: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
  })).default([]),
  errors: z.array(workbookFormulaErrorDetailSchema).default([]),
  warnings: z.array(workbookFormulaErrorDetailSchema).default([]),
}) satisfies z.ZodType<WorkbookFormulaPreviewResponse>

export const workbookUpdateColumnRequestSchema = z.object({
  base_version: z.number().int().positive(),
  label: z.string().min(1).max(255).optional(),
  data_type: z.enum(["text", "number", "date", "currency", "boolean"]).optional(),
  formula: workbookColumnFormulaSchema.nullable().optional(),
}) satisfies z.ZodType<WorkbookUpdateColumnRequest>

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

const workbookCellValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
])

export const workbookCellValueLookupRequestSchema = z.object({
  base_version: z.number().int().positive(),
  cells: z.array(z.object({
    row_number: z.number().int().positive(),
    column_id: z.string().min(1).max(64),
  })).min(1).max(500),
}).superRefine((payload, context) => {
  const seen = new Set<string>()
  payload.cells.forEach((cell, index) => {
    const key = `${cell.row_number}:${cell.column_id}`
    if (seen.has(key)) {
      context.addIssue({
        code: "custom",
        message: "Duplicate workbook cell references are not allowed.",
        path: ["cells", index],
      })
    }
    seen.add(key)
  })
}) satisfies z.ZodType<WorkbookCellValueLookupRequest>

export const workbookCellValueLookupResponseSchema = z.object({
  session_id: z.uuid(),
  version: z.number().int().positive(),
  cells: z.array(z.object({
    row_number: z.number().int().positive(),
    column_id: z.string().min(1).max(64),
    value: workbookCellValueSchema,
  })).min(1).max(500),
}) satisfies z.ZodType<WorkbookCellValueLookupResponse>

export const workbookSaveRequestSchema = z.object({
    request_id: z.uuid(),
    base_version: z.number().int().positive(),
    changes: z.array(z.object({
      row_number: z.number().int().positive(),
      values: z.record(z.string().min(1).max(255), workbookCellValueSchema)
        .refine((values) => Object.keys(values).length > 0, "At least one cell value is required."),
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
    })
    if (changedCells > 500) {
      context.addIssue({
        code: "custom",
        message: "A save may change at most 500 cells.",
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
  column_mapping: z.partialRecord(semanticFieldSchema, z.number().int().positive()),
  mapping_status: z.enum(["READY", "MAPPING_INCOMPLETE", "AMBIGUOUS_MAPPING"]),
  missing_required_fields: z.array(semanticFieldSchema),
  ambiguous_fields: z.partialRecord(semanticFieldSchema, z.array(z.number().int().positive())),
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

const workbookSessionStatusSchema = z.enum([
  "DRAFT",
  "COMPLETED",
  "DISCARDED",
  "FAILED",
])

export const workbookSessionSchema = z.object({
  id: z.uuid(),
  workbook_id: z.uuid(),
  original_filename: z.string(),
  selected_sheet_name: z.string(),
  header_row_number: z.number().int().positive(),
  column_mapping: z.record(z.string(), z.number().int().positive()),
  current_version: z.number().int().positive(),
  status: workbookSessionStatusSchema,
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  column_config: z.array(z.object({
    id: z.string(), label: z.string(), column_number: z.number().int().positive(),
    origin: z.enum(["source", "user"]), data_type: z.enum(["text", "number", "date", "currency", "boolean"]),
    hidden: z.boolean(), sticky: z.boolean(), semantic_field: semanticFieldSchema.nullable().optional(),
    formula: workbookColumnFormulaSchema.nullable().optional(),
  })).default([]),
}) satisfies z.ZodType<WorkbookSession>

export const workbookSessionSummarySchema = z.object({
  id: z.uuid(),
  display_name: z.string().min(1).max(255),
  original_filename: z.string().min(1).max(255),
  selected_sheet_name: z.string().min(1).max(255),
  current_version: z.number().int().positive(),
  status: workbookSessionStatusSchema,
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
}) satisfies z.ZodType<WorkbookSessionSummary>

export const workbookSessionListSchema = z.object({
  items: z.array(workbookSessionSummarySchema),
  pagination: z.object({
    page: z.number().int().positive(),
    page_size: z.number().int().min(1).max(200),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
  }),
}) satisfies z.ZodType<WorkbookSessionList>

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
      data_type: z.enum(["text", "number", "date", "currency", "boolean"]),
      hidden: z.boolean().default(false),
      sticky: z.boolean().default(false),
      group_label: z.string().nullable().optional(),
      header_row_span: z.number().int().min(1).max(2).default(1),
      formula: workbookColumnFormulaSchema.nullable().optional(),
      number_format: z.string().nullable().optional(),
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
