"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type CellContext,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  EyeOff,
  FunctionSquare,
  Pin,
  Trash2,
} from "lucide-react"

import { EmptyState } from "@/components/command-center"
import { EditablePriceCell } from "@/components/workbook-editor/editable-price-cell"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { WorkbookRecordsPage } from "@/schemas/workbook"
import styles from "./workbook-records-table.module.css"

type WorkbookRow = WorkbookRecordsPage["items"][number]
type WorkbookColumn = WorkbookRecordsPage["columns"][number]
type DraftMap = Map<number, Partial<Record<string, string>>>
type ErrorMap = Map<string, string>
type WorkbookCellMeta = {
  workbookColumn: WorkbookColumn
}
type WorkbookTableMeta = {
  booleanLabels: { blank: string; true: string; false: string }
  drafts: DraftMap
  errors: ErrorMap
  onDraftChange: (rowNumber: number, field: string, value: string) => void
  rowLabel: string
}

const helper = createColumnHelper<WorkbookRow>()
const ROW_GUTTER_WIDTH = 48
const DATA_COLUMN_WIDTH = 192
const PRICE_FIELD_ORDER = new Map([
  ["net_price", 0],
  ["selling_price", 1],
])

function isPricingColumn(column: WorkbookColumn): boolean {
  const businessField = column.semantic_field ?? column.field
  return businessField === "net_price" || businessField === "selling_price"
}

function numberFormatOptions(numberFormat?: string | null): {
  maximumFractionDigits: number
  minimumFractionDigits: number
  useGrouping: boolean
} {
  const section = numberFormat?.split(";")[0] ?? ""
  const decimalPart = section.match(/\.([0#]+)/)?.[1] ?? ""
  return {
    maximumFractionDigits: decimalPart.length || 20,
    minimumFractionDigits: (decimalPart.match(/0/g) ?? []).length,
    useGrouping: section.includes(","),
  }
}

export function formatWorkbookValue(value: number, numberFormat?: string | null): string {
  const options = numberFormatOptions(numberFormat)
  if (!numberFormat?.includes("%")) {
    return new Intl.NumberFormat("vi-VN", options).format(value)
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "percent",
    ...options,
  }).format(value)
}

/**
 * Keep the cell renderer identity stable while draft values change. TanStack
 * treats a column's `cell` function as a React component; recreating that
 * function on every keystroke remounts the input and drops its focus.
 */
function WorkbookDataCell({
  column,
  row,
  table,
}: CellContext<WorkbookRow, WorkbookRow["values"][string]>) {
  const cellMeta = column.columnDef.meta as WorkbookCellMeta | undefined
  const tableMeta = table.options.meta as WorkbookTableMeta | undefined
  if (!cellMeta || !tableMeta) return null

  const workbookColumn = cellMeta.workbookColumn
  const record = row.original
  const field = workbookColumn.field
  const rawValue = record.values[field]
  const error = tableMeta.errors.get(`${record.row_number}:${field}`)
  const storedDraft = tableMeta.drafts.get(record.row_number)?.[field]
  const ariaLabel =
    `${workbookColumn.label}, ${tableMeta.rowLabel.replace("{row}", String(record.row_number))}`

  if (isPricingColumn(workbookColumn)) {
    return (
      <EditablePriceCell
        ariaLabel={ariaLabel}
        draft={storedDraft}
        editable={workbookColumn.editable && record.editable[field] !== false}
        error={error}
        onChange={(value) =>
          tableMeta.onDraftChange(record.row_number, field, value)}
        value={rawValue}
      />
    )
  }

  if (workbookColumn.editable) {
    let inputValue = rawValue == null
      ? ""
      : (workbookColumn.data_type === "currency"
          || workbookColumn.data_type === "number")
          && typeof rawValue === "number"
        ? formatWorkbookValue(rawValue, workbookColumn.number_format)
        : String(rawValue)
    if (workbookColumn.data_type === "date" && rawValue) {
      inputValue = String(rawValue).slice(0, 10)
    }
    const draftValue = storedDraft ?? inputValue
    const drafted = storedDraft !== undefined

    return (
      <div className={styles.cellEditor}>
        {workbookColumn.data_type === "boolean" ? (
          <select
            aria-invalid={Boolean(error)}
            aria-label={ariaLabel}
            className={cn(
              styles.cellControl,
              drafted && styles.draftedControl,
              error && styles.errorControl,
            )}
            disabled={record.editable[field] === false}
            onChange={(event) =>
              tableMeta.onDraftChange(
                record.row_number,
                field,
                event.target.value,
              )}
            value={draftValue}
          >
            <option value="">{tableMeta.booleanLabels.blank}</option>
            <option value="true">{tableMeta.booleanLabels.true}</option>
            <option value="false">{tableMeta.booleanLabels.false}</option>
          </select>
        ) : (
          <Input
            aria-invalid={Boolean(error)}
            aria-label={ariaLabel}
            className={cn(
              styles.cellControl,
              (workbookColumn.data_type === "currency"
                || workbookColumn.data_type === "number")
                && styles.numericControl,
              drafted && styles.draftedControl,
              error && styles.errorControl,
            )}
            disabled={record.editable[field] === false}
            inputMode={
              workbookColumn.data_type === "currency"
                || workbookColumn.data_type === "number"
                ? "decimal"
                : undefined
            }
            onChange={(event) =>
              tableMeta.onDraftChange(
                record.row_number,
                field,
                event.target.value,
              )}
            type={workbookColumn.data_type === "date" ? "date" : "text"}
            value={draftValue}
          />
        )}
        {error ? (
          <p className={styles.cellError} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  const value = rawValue
  let display = value == null || value === "" ? "-" : String(value)
  if (
    (workbookColumn.data_type === "currency"
      || workbookColumn.data_type === "number")
    && typeof value === "number"
  ) {
    display = formatWorkbookValue(value, workbookColumn.number_format)
  }
  if (workbookColumn.data_type === "date" && value) {
    const [year, month, day] = String(value).slice(0, 10).split("-")
    if (year && month && day) display = `${day}/${month}/${year}`
  }
  if (workbookColumn.data_type === "boolean" && typeof value === "boolean") {
    display = value
      ? tableMeta.booleanLabels.true
      : tableMeta.booleanLabels.false
  }
  return (
    <span
      className={cn(
        styles.displayCell,
        (workbookColumn.data_type === "currency"
          || workbookColumn.data_type === "number")
          && styles.numericCell,
        workbookColumn.formula && styles.formulaValue,
      )}
      title={display === "-" ? undefined : display}
    >
      {display}
    </span>
  )
}

export function WorkbookRecordsTable({
  booleanLabels,
  drafts,
  emptyLabel,
  errors,
  headerActionLabels,
  isConfiguringColumns,
  structuralActionDisabledReason,
  onDraftChange,
  onHideColumn,
  onRemoveColumn,
  onSort,
  onToggleSticky,
  records,
  rowLabel,
  sortBy,
  sortDirection,
}: {
  booleanLabels: { blank: string; true: string; false: string }
  drafts: DraftMap
  emptyLabel: string
  errors: ErrorMap
  headerActionLabels: {
    hide: string
    pin: string
    unpin: string
    remove: string
    removeConfirm: string
  }
  isConfiguringColumns: boolean
  structuralActionDisabledReason?: string
  onDraftChange: (rowNumber: number, field: string, value: string) => void
  onHideColumn: (columnId: string) => void
  onRemoveColumn: (columnId: string) => void
  onSort: (columnId: string) => void
  onToggleSticky: (columnId: string, sticky: boolean) => void
  records: WorkbookRecordsPage
  rowLabel: string
  sortBy?: string
  sortDirection: "asc" | "desc"
}) {
  const visibleColumns = React.useMemo(() => {
    const visible = records.columns.filter((column) => !column.hidden)
    const dataColumns = visible.filter((column) => !isPricingColumn(column))
    const priceColumns = visible
      .filter(isPricingColumn)
      .sort((left, right) =>
        (PRICE_FIELD_ORDER.get(left.semantic_field ?? left.field) ?? 99)
        - (PRICE_FIELD_ORDER.get(right.semantic_field ?? right.field) ?? 99),
      )
    return [...dataColumns, ...priceColumns]
  }, [records.columns])

  const pricingColumns = React.useMemo(
    () => visibleColumns.filter(isPricingColumn),
    [visibleColumns],
  )
  const firstPricingField = pricingColumns[0]?.field

  const stickyOffsets = React.useMemo(() => {
    const offsets = new Map<string, number>()
    let offset = ROW_GUTTER_WIDTH
    for (const column of visibleColumns.filter(
      (item) => item.sticky && !isPricingColumn(item),
    )) {
      offsets.set(column.field, offset)
      offset += DATA_COLUMN_WIDTH
    }
    return offsets
  }, [visibleColumns])

  const pricingOffsets = React.useMemo(() => {
    const offsets = new Map<string, number>()
    pricingColumns
      .slice()
      .reverse()
      .forEach((column, index) => {
        offsets.set(column.field, index * DATA_COLUMN_WIDTH)
      })
    return offsets
  }, [pricingColumns])

  const placementStyle = React.useCallback(
    (field: string): React.CSSProperties | undefined => {
      const left = stickyOffsets.get(field)
      if (left !== undefined) return { left }
      const right = pricingOffsets.get(field)
      if (right !== undefined) return { right }
      return undefined
    },
    [pricingOffsets, stickyOffsets],
  )

  const renderColumnHeader = React.useCallback((column: WorkbookColumn) => {
    const active = sortBy === column.id
    const pricing = isPricingColumn(column)
    const Icon = active
      ? (sortDirection === "asc" ? ArrowUp : ArrowDown)
      : ChevronsUpDown
    const disabledTitle = isConfiguringColumns && structuralActionDisabledReason
      ? structuralActionDisabledReason
      : undefined

    return (
      <div className={styles.headerContent}>
        <button
          aria-label={column.label || column.id}
          className={cn(
            styles.sortButton,
            column.origin === "user" && styles.sortButtonUser,
            pricing && column.origin !== "user" && styles.sortButtonPricing,
          )}
          onClick={() => onSort(column.id)}
          type="button"
        >
          {column.formula ? (
            <FunctionSquare aria-hidden="true" className={styles.headerIcon} />
          ) : null}
          <span className={styles.headerLabel}>
            {column.label}
          </span>
          <Icon
            aria-hidden="true"
            className={cn(
              styles.sortIcon,
              active && styles.sortIconActive,
            )}
          />
        </button>

        <div
          className={cn(
            styles.headerActions,
            pricing && styles.headerActionsPricing,
          )}
        >
          {!pricing ? (
            <button
              aria-label={column.sticky ? headerActionLabels.unpin : headerActionLabels.pin}
              aria-pressed={column.sticky}
              className={cn(
                styles.headerAction,
                column.sticky && styles.headerActionSelected,
              )}
              disabled={isConfiguringColumns}
              onClick={() => onToggleSticky(column.id, !column.sticky)}
              title={disabledTitle
                ?? (column.sticky ? headerActionLabels.unpin : headerActionLabels.pin)}
              type="button"
            >
              <Pin
                aria-hidden="true"
                className={cn(patterns.iconCompact, column.sticky && styles.filled)}
              />
            </button>
          ) : null}
          {column.origin === "user" ? (
            <button
              aria-label={headerActionLabels.remove}
              className={cn(styles.headerAction, styles.headerActionDanger)}
              disabled={isConfiguringColumns}
              onClick={() => {
                if (
                  window.confirm(
                    headerActionLabels.removeConfirm.replace("{column}", column.label),
                  )
                ) {
                  onRemoveColumn(column.id)
                }
              }}
              title={disabledTitle ?? headerActionLabels.remove}
              type="button"
            >
              <Trash2 aria-hidden="true" className={patterns.iconCompact} />
            </button>
          ) : null}
          <button
            aria-label={headerActionLabels.hide}
            className={styles.headerAction}
            disabled={isConfiguringColumns}
            onClick={() => onHideColumn(column.id)}
            title={disabledTitle ?? headerActionLabels.hide}
            type="button"
          >
            <EyeOff aria-hidden="true" className={patterns.iconCompact} />
          </button>
        </div>
      </div>
    )
  }, [
    headerActionLabels.hide,
    headerActionLabels.pin,
    headerActionLabels.remove,
    headerActionLabels.removeConfirm,
    headerActionLabels.unpin,
    isConfiguringColumns,
    onHideColumn,
    onRemoveColumn,
    onSort,
    onToggleSticky,
    sortBy,
    sortDirection,
    structuralActionDisabledReason,
  ])

  const groupedHeaderRuns: Array<{
    columns: WorkbookColumn[]
    groupLabel: string | null
  }> = []
  if (records.header_row_count === 2) {
    for (const column of visibleColumns) {
      const previous = groupedHeaderRuns[groupedHeaderRuns.length - 1]
      if (column.group_label && previous?.groupLabel === column.group_label) {
        previous.columns.push(column)
      } else {
        groupedHeaderRuns.push({
          columns: [column],
          groupLabel: column.group_label ?? null,
        })
      }
    }
  }

  const columns = React.useMemo<ColumnDef<WorkbookRow, WorkbookRow["values"][string]>[]>(
    () =>
      visibleColumns.map((column) =>
        helper.accessor((row) => row.values[column.field], {
          id: column.field,
          meta: { workbookColumn: column } satisfies WorkbookCellMeta,
          header: () => renderColumnHeader(column),
          cell: WorkbookDataCell,
        }),
      ),
    [renderColumnHeader, visibleColumns],
  )

  // TanStack Table intentionally exposes mutable table callbacks; React Compiler
  // skips this hook, while React rendering remains supported by the library.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: records.items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      booleanLabels,
      drafts,
      errors,
      onDraftChange,
      rowLabel,
    } satisfies WorkbookTableMeta,
  })

  return (
    <div
      aria-label={records.sheet_name}
      className={styles.scrollRegion}
      role="region"
      tabIndex={0}
    >
      <Table className={styles.recordsTable}>
        <TableHeader className={styles.recordsHeader}>
          {records.header_row_count === 2 ? (
            <>
              <TableRow>
                <TableHead
                  className={styles.rowGutterHeader}
                  rowSpan={2}
                  scope="col"
                >
                  #
                </TableHead>
                {groupedHeaderRuns.map((run) => {
                  const column = run.columns[0]
                  const field = column.field
                  const pricing = run.columns.every(isPricingColumn)
                  const positioned = !run.groupLabel
                  const stickyLeft = positioned ? stickyOffsets.get(field) : undefined
                  const stickyRight = positioned ? pricingOffsets.get(field) : undefined
                  return (
                    <TableHead
                      className={cn(
                        styles.columnHeader,
                        styles.groupHeader,
                        pricing && styles.pricingHeader,
                        stickyLeft !== undefined
                          && styles.stickyLeft,
                        stickyRight !== undefined
                          && styles.stickyRight,
                        field === firstPricingField
                          && styles.pricingDivider,
                      )}
                      colSpan={run.columns.length}
                      key={`${run.groupLabel ?? field}-${field}`}
                      rowSpan={run.groupLabel ? 1 : 2}
                      style={positioned ? placementStyle(field) : undefined}
                    >
                      {run.groupLabel ? (
                        <span className={styles.groupLabel}>
                          {run.groupLabel}
                        </span>
                      ) : renderColumnHeader(column)}
                    </TableHead>
                  )
                })}
              </TableRow>
              <TableRow>
                {visibleColumns.filter((column) => column.group_label).map((column) => {
                  const pricing = isPricingColumn(column)
                  const stickyLeft = stickyOffsets.get(column.field)
                  const stickyRight = pricingOffsets.get(column.field)
                  return (
                    <TableHead
                      className={cn(
                        styles.columnHeader,
                        pricing && styles.pricingHeader,
                        stickyLeft !== undefined
                          && styles.stickyLeft,
                        stickyRight !== undefined
                          && styles.stickyRight,
                        column.field === firstPricingField
                          && styles.pricingDivider,
                      )}
                      key={column.field}
                      style={placementStyle(column.field)}
                    >
                      {renderColumnHeader(column)}
                    </TableHead>
                  )
                })}
              </TableRow>
            </>
          ) : table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              <TableHead
                className={styles.rowGutterHeader}
                scope="col"
              >
                #
              </TableHead>
              {group.headers.map((header) => {
                const field = header.column.id
                const column = visibleColumns.find((item) => item.field === field)
                const pricing = column ? isPricingColumn(column) : false
                const stickyLeft = stickyOffsets.get(field)
                const stickyRight = pricingOffsets.get(field)
                return (
                  <TableHead
                    className={cn(
                      styles.columnHeader,
                      pricing && styles.pricingHeader,
                      stickyLeft !== undefined
                        && styles.stickyLeft,
                      stickyRight !== undefined
                        && styles.stickyRight,
                      field === firstPricingField && styles.pricingDivider,
                    )}
                    key={header.id}
                    style={placementStyle(field)}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={Math.max(columns.length + 1, 1)}>
                <EmptyState
                  className={styles.emptyState}
                  icon={ChevronsUpDown}
                  message={emptyLabel}
                />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.original.row_number}>
                <TableCell className={styles.rowGutter}>
                  {row.original.row_number}
                </TableCell>
                {row.getVisibleCells().map((cell) => {
                  const field = cell.column.id
                  const column = visibleColumns.find((item) => item.field === field)
                  const pricing = column ? isPricingColumn(column) : false
                  const stickyLeft = stickyOffsets.get(field)
                  const stickyRight = pricingOffsets.get(field)
                  const drafted =
                    drafts.get(row.original.row_number)?.[field] !== undefined
                  return (
                    <TableCell
                      className={cn(
                        styles.dataCell,
                        column?.formula && styles.dataCellFormula,
                        drafted && !pricing
                          && styles.dataCellDrafted,
                        pricing
                          && styles.dataCellPricing,
                        stickyLeft !== undefined
                          && styles.dataCellSticky,
                        stickyRight !== undefined
                          && styles.stickyRight,
                        field === firstPricingField
                          && styles.pricingDivider,
                      )}
                      key={cell.id}
                      style={placementStyle(field)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
