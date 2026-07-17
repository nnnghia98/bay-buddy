"use client"

import * as React from "react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff, FunctionSquare, Pin, Trash2 } from "lucide-react"

import { EmptyState } from "@/components/command-center"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { WorkbookRecordsPage } from "@/schemas/workbook"

type WorkbookRow = WorkbookRecordsPage["items"][number]
type DraftMap = Map<number, Partial<Record<string, string>>>
type ErrorMap = Map<string, string>

const helper = createColumnHelper<WorkbookRow>()
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

export function WorkbookRecordsTable({
  booleanLabels,
  drafts,
  emptyLabel,
  errors,
  headerActionLabels,
  isConfiguringColumns,
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
  const visibleColumns = records.columns.filter((column) => !column.hidden)
  const stickyOffsets = new Map<string, number>()
  let offset = 0
  for (const column of visibleColumns.filter((item) => item.sticky)) {
    stickyOffsets.set(column.field, offset)
    offset += 176
  }
  const renderColumnHeader = React.useCallback((column: WorkbookRecordsPage["columns"][number]) => {
    const active = sortBy === column.id
    const Icon = active ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown
    return (
      <div className="group/header flex min-w-36 items-center gap-1">
        <button
          aria-label={column.label || column.id}
          className="inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => onSort(column.id)}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-1.5 whitespace-pre-line normal-case tracking-normal">{column.formula ? <FunctionSquare aria-hidden="true" className="size-3.5 shrink-0 text-primary" /> : null}<span className="truncate">{column.label}</span></span>
          <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
        <div className="flex shrink-0 items-center rounded-md border border-border/70 bg-white/80 p-0.5 opacity-70 shadow-sm transition-opacity group-hover/header:opacity-100 group-focus-within/header:opacity-100">
          <button
            aria-label={column.sticky ? headerActionLabels.unpin : headerActionLabels.pin}
            aria-pressed={column.sticky}
            className={cn(
              "grid size-7 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              column.sticky && "bg-primary/10 text-primary",
            )}
            disabled={isConfiguringColumns}
            onClick={() => onToggleSticky(column.id, !column.sticky)}
            title={column.sticky ? headerActionLabels.unpin : headerActionLabels.pin}
            type="button"
          >
            <Pin aria-hidden="true" className={cn("size-3.5", column.sticky && "fill-current")} />
          </button>
          {column.origin === "user" ? <button
            aria-label={headerActionLabels.remove}
            className="grid size-7 place-items-center rounded-sm text-muted-foreground hover:bg-red-50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            disabled={isConfiguringColumns}
            onClick={() => {
              if (window.confirm(headerActionLabels.removeConfirm.replace("{column}", column.label))) onRemoveColumn(column.id)
            }}
            title={headerActionLabels.remove}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </button> : null}
          <button
            aria-label={headerActionLabels.hide}
            className="grid size-7 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            disabled={isConfiguringColumns}
            onClick={() => onHideColumn(column.id)}
            title={headerActionLabels.hide}
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
    headerActionLabels.unpin,
    headerActionLabels.remove,
    headerActionLabels.removeConfirm,
    isConfiguringColumns,
    onHideColumn,
    onRemoveColumn,
    onSort,
    onToggleSticky,
    sortBy,
    sortDirection,
  ])
  const groupedHeaderRuns: Array<{
    columns: typeof visibleColumns
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
          header: () => renderColumnHeader(column),
          cell: ({ row }) => {
            const record = row.original
            const field = column.field
            if (column.editable) {
              const rawValue = record.values[field]
              const error = errors.get(`${record.row_number}:${field}`)
              let inputValue = rawValue == null
                ? ""
                : (column.data_type === "currency" || column.data_type === "number")
                    && typeof rawValue === "number"
                  ? formatWorkbookValue(rawValue, column.number_format)
                  : String(rawValue)
              if (column.data_type === "date" && rawValue) inputValue = String(rawValue).slice(0, 10)
              const draftValue = drafts.get(record.row_number)?.[field] ?? inputValue
              const ariaLabel = `${column.label}, ${rowLabel.replace("{row}", String(record.row_number))}`
              return (
                <div className="min-w-40 px-2 py-1.5">
                  {column.data_type === "boolean" ? (
                    <select
                      aria-invalid={Boolean(error)}
                      aria-label={ariaLabel}
                      className={cn("h-9 w-full rounded-md border border-input bg-white px-3 text-sm", error && "border-destructive")}
                      disabled={record.editable[field] === false}
                      onChange={(event) => onDraftChange(record.row_number, field, event.target.value)}
                      value={draftValue}
                    >
                      <option value="">{booleanLabels.blank}</option>
                      <option value="true">{booleanLabels.true}</option>
                      <option value="false">{booleanLabels.false}</option>
                    </select>
                  ) : (
                    <Input
                      aria-invalid={Boolean(error)}
                      aria-label={ariaLabel}
                      className={cn("h-9", (column.data_type === "currency" || column.data_type === "number") && "text-right tabular-nums", error && "border-destructive")}
                      disabled={record.editable[field] === false}
                      inputMode={column.data_type === "currency" || column.data_type === "number" ? "decimal" : undefined}
                      onChange={(event) => onDraftChange(record.row_number, field, event.target.value)}
                      type={column.data_type === "date" ? "date" : "text"}
                      value={draftValue}
                    />
                  )}
                  {error ? <p className="mt-1 text-xs text-destructive" role="alert">{error}</p> : null}
                </div>
              )
            }
            const value = record.values[field]
            let display = value == null || value === "" ? "—" : String(value)
            if ((column.data_type === "currency" || column.data_type === "number") && typeof value === "number") {
              display = formatWorkbookValue(value, column.number_format)
            }
            if (column.data_type === "date" && value) {
              const [year, month, day] = String(value).slice(0, 10).split("-")
              if (year && month && day) display = `${day}/${month}/${year}`
            }
            if (column.data_type === "boolean" && typeof value === "boolean") {
              display = value ? booleanLabels.true : booleanLabels.false
            }
            return <span className={cn("block min-w-32 px-4 py-3 text-sm", (column.data_type === "currency" || column.data_type === "number") && "text-right tabular-nums", column.formula && "bg-primary/[0.035] font-medium text-foreground/80")}>{display}</span>
          },
        }),
      ),
    [booleanLabels, drafts, errors, onDraftChange, renderColumnHeader, visibleColumns, rowLabel],
  )
  // TanStack Table intentionally exposes mutable table callbacks; React Compiler
  // skips this hook, while React rendering remains supported by the library.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: records.items, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="max-h-[calc(100dvh-19rem)] min-h-80 w-full overflow-auto">
      <Table className="min-w-max border-separate border-spacing-0">
        <TableHeader className="sticky top-0 z-30 bg-secondary">
          {records.header_row_count === 2 ? (
            <>
              <TableRow>
                {groupedHeaderRuns.map((run) => {
                  const column = run.columns[0]
                  const field = column.field
                  const stickyLeft = stickyOffsets.get(field)
                  return (
                    <TableHead
                      className={cn(
                        "border-b border-r border-border bg-secondary px-4 py-2.5 text-center text-xs font-semibold text-foreground",
                        stickyLeft !== undefined && "sticky z-40 min-w-44 shadow-[8px_0_14px_rgba(24,29,38,0.04)]",
                      )}
                      colSpan={run.columns.length}
                      key={`${run.groupLabel ?? field}-${field}`}
                      rowSpan={run.groupLabel ? 1 : 2}
                      style={stickyLeft === undefined ? undefined : { left: stickyLeft }}
                    >
                      {run.groupLabel ? (
                        <span className="whitespace-pre-line">{run.groupLabel}</span>
                      ) : renderColumnHeader(column)}
                    </TableHead>
                  )
                })}
              </TableRow>
              <TableRow>
                {visibleColumns.filter((column) => column.group_label).map((column) => {
                  const stickyLeft = stickyOffsets.get(column.field)
                  return (
                    <TableHead
                      className={cn(
                        "border-b border-r border-border bg-secondary px-4 py-2.5 text-xs font-semibold text-foreground",
                        stickyLeft !== undefined && "sticky z-40 min-w-44 shadow-[8px_0_14px_rgba(24,29,38,0.04)]",
                      )}
                      key={column.field}
                      style={stickyLeft === undefined ? undefined : { left: stickyLeft }}
                    >
                      {renderColumnHeader(column)}
                    </TableHead>
                  )
                })}
              </TableRow>
            </>
          ) : table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const field = header.column.id
                const stickyLeft = stickyOffsets.get(field)
                return (
                  <TableHead
                    className={cn(
                      "border-b border-r border-border bg-secondary px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-foreground",
                      stickyLeft !== undefined && "sticky z-40 min-w-44 shadow-[8px_0_14px_rgba(24,29,38,0.04)]",
                    )}
                    key={header.id}
                    style={stickyLeft === undefined ? undefined : { left: stickyLeft }}
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
              <TableCell colSpan={Math.max(columns.length, 1)}>
                <EmptyState icon={ChevronsUpDown} message={emptyLabel} />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow className="group" key={row.original.row_number}>
                {row.getVisibleCells().map((cell) => {
                  const field = cell.column.id
                  const stickyLeft = stickyOffsets.get(field)
                  return (
                    <TableCell
                      className={cn(
                        "border-b border-r border-border bg-white p-0 group-hover:bg-secondary/30",
                        stickyLeft !== undefined && "sticky z-20 min-w-44 bg-white shadow-[8px_0_14px_rgba(24,29,38,0.04)] group-hover:bg-secondary",
                      )}
                      key={cell.id}
                      style={stickyLeft === undefined ? undefined : { left: stickyLeft }}
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
