"use client"

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
      <div className="w-48 px-2 py-1.5">
        {workbookColumn.data_type === "boolean" ? (
          <select
            aria-invalid={Boolean(error)}
            aria-label={ariaLabel}
            className={cn(
              "h-9 w-full rounded-md border border-input bg-white px-3 text-sm font-medium shadow-none focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
              drafted && "border-primary/45 bg-primary/[0.055] ring-1 ring-primary/10",
              error && "border-destructive",
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
              "h-9 shadow-none",
              (workbookColumn.data_type === "currency"
                || workbookColumn.data_type === "number")
                && "text-right font-mono text-sm tabular-nums",
              drafted && "border-primary/45 bg-primary/[0.055] ring-1 ring-primary/10",
              error && "border-destructive",
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
          <p className="mt-1 text-xs text-destructive" role="alert">
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
        "block w-48 truncate px-4 py-3 text-sm",
        (workbookColumn.data_type === "currency"
          || workbookColumn.data_type === "number")
          && "text-right font-mono tabular-nums",
        workbookColumn.formula && "font-medium text-foreground/80",
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
      <div className="group/header relative flex min-w-0 items-center">
        <button
          aria-label={column.label || column.id}
          className={cn(
            "inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-sm pr-16 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            column.origin === "user" && "pr-24",
            pricing && column.origin !== "user" && "pr-10",
          )}
          onClick={() => onSort(column.id)}
          type="button"
        >
          {column.formula ? (
            <FunctionSquare aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
          ) : null}
          <span className="min-w-0 truncate whitespace-pre-line normal-case tracking-normal">
            {column.label}
          </span>
          <Icon
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 opacity-45",
              active && "text-primary opacity-100",
            )}
          />
        </button>

        <div
          className={cn(
            "absolute right-0 top-1/2 flex -translate-y-1/2 items-center rounded-sm border border-border/80 bg-white/95 p-0.5 opacity-100 shadow-sm transition-opacity md:opacity-0 md:group-hover/header:opacity-100 md:group-focus-within/header:opacity-100",
            pricing && "border-blue-200 bg-blue-50/95",
          )}
        >
          {!pricing ? (
            <button
              aria-label={column.sticky ? headerActionLabels.unpin : headerActionLabels.pin}
              aria-pressed={column.sticky}
              className={cn(
                "grid size-7 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                column.sticky && "bg-primary/10 text-primary",
              )}
              disabled={isConfiguringColumns}
              onClick={() => onToggleSticky(column.id, !column.sticky)}
              title={disabledTitle
                ?? (column.sticky ? headerActionLabels.unpin : headerActionLabels.pin)}
              type="button"
            >
              <Pin
                aria-hidden="true"
                className={cn("size-3.5", column.sticky && "fill-current")}
              />
            </button>
          ) : null}
          {column.origin === "user" ? (
            <button
              aria-label={headerActionLabels.remove}
              className="grid size-7 place-items-center rounded-sm text-muted-foreground hover:bg-red-50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              <Trash2 aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
          <button
            aria-label={headerActionLabels.hide}
            className="grid size-7 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            disabled={isConfiguringColumns}
            onClick={() => onHideColumn(column.id)}
            title={disabledTitle ?? headerActionLabels.hide}
            type="button"
          >
            <EyeOff aria-hidden="true" className="size-3.5" />
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
      className="max-h-[calc(100dvh-17.5rem)] min-h-[26rem] w-full overflow-auto bg-secondary/10 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 [&>div]:overflow-visible"
      role="region"
      tabIndex={0}
    >
      <Table className="min-w-max border-separate border-spacing-0">
        <TableHeader className="sticky top-0 z-40 bg-secondary">
          {records.header_row_count === 2 ? (
            <>
              <TableRow>
                <TableHead
                  className="sticky left-0 z-[60] w-12 min-w-12 max-w-12 border-r border-border bg-secondary px-0 text-center font-mono tracking-normal text-muted-foreground"
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
                        "w-48 min-w-48 max-w-48 border-b border-r border-border bg-secondary px-3 py-2.5 text-center text-xs font-semibold text-foreground",
                        pricing && "bg-blue-50 text-primary",
                        stickyLeft !== undefined
                          && "sticky z-50 shadow-[8px_0_14px_rgba(24,29,38,0.05)]",
                        stickyRight !== undefined
                          && "md:sticky md:z-50 md:shadow-[-8px_0_14px_rgba(24,29,38,0.05)]",
                        field === firstPricingField
                          && "border-l-2 border-l-primary/25",
                      )}
                      colSpan={run.columns.length}
                      key={`${run.groupLabel ?? field}-${field}`}
                      rowSpan={run.groupLabel ? 1 : 2}
                      style={positioned ? placementStyle(field) : undefined}
                    >
                      {run.groupLabel ? (
                        <span className="whitespace-pre-line normal-case tracking-normal">
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
                        "w-48 min-w-48 max-w-48 border-b border-r border-border bg-secondary px-3 py-2.5 text-xs font-semibold text-foreground",
                        pricing && "bg-blue-50 text-primary",
                        stickyLeft !== undefined
                          && "sticky z-50 shadow-[8px_0_14px_rgba(24,29,38,0.05)]",
                        stickyRight !== undefined
                          && "md:sticky md:z-50 md:shadow-[-8px_0_14px_rgba(24,29,38,0.05)]",
                        column.field === firstPricingField
                          && "border-l-2 border-l-primary/25",
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
                className="sticky left-0 z-[60] w-12 min-w-12 max-w-12 border-r border-border bg-secondary px-0 text-center font-mono tracking-normal text-muted-foreground"
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
                      "w-48 min-w-48 max-w-48 border-b border-r border-border bg-secondary px-3 py-3 text-xs font-semibold text-foreground",
                      pricing && "bg-blue-50 text-primary",
                      stickyLeft !== undefined
                        && "sticky z-50 shadow-[8px_0_14px_rgba(24,29,38,0.05)]",
                      stickyRight !== undefined
                        && "md:sticky md:z-50 md:shadow-[-8px_0_14px_rgba(24,29,38,0.05)]",
                      field === firstPricingField && "border-l-2 border-l-primary/25",
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
                  className="py-20"
                  icon={ChevronsUpDown}
                  message={emptyLabel}
                />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow className="group" key={row.original.row_number}>
                <TableCell className="sticky left-0 z-30 w-12 min-w-12 max-w-12 border-r border-border bg-secondary/80 px-0 py-0 text-center font-mono text-[11px] font-medium text-muted-foreground group-hover:bg-secondary">
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
                        "w-48 min-w-48 max-w-48 border-b border-r border-border bg-white p-0 group-hover:bg-secondary/30",
                        column?.formula && "bg-primary/[0.025]",
                        drafted && !pricing
                          && "bg-blue-50/65 group-hover:bg-blue-50/80",
                        pricing
                          && "bg-blue-50/75 group-hover:bg-blue-50 md:sticky md:z-20",
                        stickyLeft !== undefined
                          && "sticky z-30 bg-white shadow-[8px_0_14px_rgba(24,29,38,0.05)] group-hover:bg-secondary",
                        stickyRight !== undefined
                          && "md:shadow-[-8px_0_14px_rgba(24,29,38,0.05)]",
                        field === firstPricingField
                          && "border-l-2 border-l-primary/25",
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
