import { describe, expect, it } from "vitest"

import { workbookColumnFormulaSchema, type WorkbookColumn } from "@/schemas/workbook"
import { initialFormulaDraft } from "./formula-builder-dialog"
import { defaultFormulaExpression } from "./formula-expression-node"
import { formatFormulaPreviewValue } from "./formula-preview"

const columns: WorkbookColumn[] = [
  {
    id: "fare",
    field: "fare",
    label: "Fare",
    editable: true,
    origin: "source",
    data_type: "currency",
    hidden: false,
    sticky: false,
  },
]

describe("guided formula builder defaults", () => {
  it("creates a versioned AST instead of raw Excel text", () => {
    const expression = defaultFormulaExpression(columns)
    const formula = workbookColumnFormulaSchema.parse({
      schema_version: 1,
      expression,
    })

    expect(formula).toEqual({
      schema_version: 1,
      expression: {
        type: "binary",
        operator: "+",
        left: { type: "column", column_id: "fare" },
        right: { type: "constant", value: "100000" },
      },
    })
  })

  it("falls back to numeric constants when no numeric columns exist", () => {
    const expression = defaultFormulaExpression([])
    expect(expression).toMatchObject({
      type: "binary",
      left: { type: "constant", value: "0" },
    })
  })

  it("initializes edit mode from the persisted AST and currency output type", () => {
    const expression = {
      type: "round" as const,
      value: { type: "column" as const, column_id: "fare" },
      digits: 0,
    }
    const draft = initialFormulaDraft(columns, {
      ...columns[0],
      id: "margin",
      label: "Margin",
      editable: false,
      origin: "user",
      data_type: "currency",
      formula: { schema_version: 1, expression },
    })

    expect(draft).toEqual({
      label: "Margin",
      dataType: "currency",
      expression,
    })
  })

  it("starts a new formula from a numeric input column", () => {
    const draft = initialFormulaDraft([
      { ...columns[0], id: "passenger", field: "passenger", label: "Passenger", data_type: "text" },
      columns[0],
    ])

    expect(draft.expression).toMatchObject({
      type: "binary",
      left: { type: "column", column_id: "fare" },
    })
  })

  it("formats currency previews as VND without changing number previews", () => {
    expect(formatFormulaPreviewValue(1_250_000, "currency")).toBe("1.250.000 ₫")
    expect(formatFormulaPreviewValue(1250.5, "number")).toBe(new Intl.NumberFormat().format(1250.5))
  })
})
