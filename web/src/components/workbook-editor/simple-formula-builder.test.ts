import { describe, expect, it } from "vitest"

import {
  workbookColumnFormulaSchema,
  type WorkbookColumn,
  type WorkbookFormulaExpression,
} from "@/schemas/workbook"
import { initialFormulaDraft } from "./formula-builder-dialog"
import { formatFormulaPreviewValue } from "./formula-preview"
import {
  buildSimpleFormulaExpression,
  createDefaultSimpleFormula,
  parseSimpleFormulaExpression,
} from "./simple-formula-builder"

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
  {
    id: "tax",
    field: "tax",
    label: "Tax",
    editable: true,
    origin: "source",
    data_type: "currency",
    hidden: false,
    sticky: false,
  },
  {
    id: "fee",
    field: "fee",
    label: "Fee",
    editable: true,
    origin: "source",
    data_type: "number",
    hidden: false,
    sticky: false,
  },
]

describe("simple formula builder", () => {
  it("creates a safe two-column AST", () => {
    const simpleFormula = createDefaultSimpleFormula(columns)
    expect(simpleFormula).toEqual({
      columnIds: ["fare", "tax"],
      operators: ["+"],
    })

    const expression = buildSimpleFormulaExpression(simpleFormula!)
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
        right: { type: "column", column_id: "tax" },
      },
    })
  })

  it("requires at least two numeric columns", () => {
    expect(createDefaultSimpleFormula(columns.slice(0, 1))).toBeNull()
    expect(createDefaultSimpleFormula([
      { ...columns[0], data_type: "text" },
      { ...columns[1], data_type: "date" },
    ])).toBeNull()
  })

  it("uses normal arithmetic precedence for three columns", () => {
    const expression = buildSimpleFormulaExpression({
      columnIds: ["fare", "tax", "fee"],
      operators: ["+", "*"],
    })

    expect(expression).toEqual({
      type: "binary",
      operator: "+",
      left: { type: "column", column_id: "fare" },
      right: {
        type: "binary",
        operator: "*",
        left: { type: "column", column_id: "tax" },
        right: { type: "column", column_id: "fee" },
      },
    })
    expect(parseSimpleFormulaExpression(expression!)).toEqual({
      columnIds: ["fare", "tax", "fee"],
      operators: ["+", "*"],
    })
  })

  it("keeps left-to-right order for operators with equal precedence", () => {
    const expression = buildSimpleFormulaExpression({
      columnIds: ["fare", "tax", "fee"],
      operators: ["-", "+"],
    })

    expect(expression).toEqual({
      type: "binary",
      operator: "+",
      left: {
        type: "binary",
        operator: "-",
        left: { type: "column", column_id: "fare" },
        right: { type: "column", column_id: "tax" },
      },
      right: { type: "column", column_id: "fee" },
    })
    expect(parseSimpleFormulaExpression(expression!)).toEqual({
      columnIds: ["fare", "tax", "fee"],
      operators: ["-", "+"],
    })
  })

  it("does not silently flatten an advanced stored formula", () => {
    const advancedExpression: WorkbookFormulaExpression = {
      type: "round",
      value: { type: "column", column_id: "fare" },
      digits: 0,
    }
    expect(parseSimpleFormulaExpression(advancedExpression)).toBeNull()

    const draft = initialFormulaDraft(columns, {
      ...columns[0],
      id: "margin",
      label: "Margin",
      editable: false,
      origin: "user",
      formula: { schema_version: 1, expression: advancedExpression },
    })

    expect(draft).toMatchObject({
      label: "Margin",
      dataType: "currency",
      expression: advancedExpression,
      formulaEnabled: true,
      simpleFormula: null,
    })
  })

  it("starts a new column with an optional two-column formula ready", () => {
    const draft = initialFormulaDraft(columns)

    expect(draft.dataType).toBe("text")
    expect(draft.formulaEnabled).toBe(false)
    expect(draft.simpleFormula).toEqual({
      columnIds: ["fare", "tax"],
      operators: ["+"],
    })
  })

  it("formats currency previews as VND without changing number previews", () => {
    expect(formatFormulaPreviewValue(1_250_000, "currency")).toBe("1.250.000 ₫")
    expect(formatFormulaPreviewValue(1250.5, "number")).toBe(new Intl.NumberFormat().format(1250.5))
  })
})
