import { describe, expect, it } from "vitest"

import { workbookColumnFormulaSchema, type WorkbookColumn } from "@/schemas/workbook"
import { defaultFormulaExpression } from "./formula-expression-node"

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
})
