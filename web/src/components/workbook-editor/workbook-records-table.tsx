"use client"

import * as React from "react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown, FunctionSquare } from "lucide-react"

import { EmptyState } from "@/components/command-center"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/formatters"
import type { WorkbookRecordsPage, WorkbookSemanticField } from "@/schemas/workbook"

type WorkbookRow = WorkbookRecordsPage["items"][number]
type DraftMap = Map<number, Partial<Record<string, string>>>
type ErrorMap = Map<string, string>

const helper = createColumnHelper<WorkbookRow>()

export function WorkbookRecordsTable({
  drafts,
  emptyLabel,
  errors,
  onDraftChange,
  onSort,
  records,
  rowLabel,
  sortBy,
  sortDirection,
}: {
  drafts: DraftMap
  emptyLabel: string
  errors: ErrorMap
  onDraftChange: (rowNumber: number, field: string, value: string) => void
  onSort: (field: WorkbookSemanticField) => void
  records: WorkbookRecordsPage
  rowLabel: string
  sortBy?: WorkbookSemanticField
  sortDirection: "asc" | "desc"
}) {
  const visibleColumns = records.columns.filter((column) => !column.hidden)
  const stickyOffsets = new Map<string, number>()
  let offset = 0
  for (const column of visibleColumns.filter((item) => item.sticky)) {
    stickyOffsets.set(column.field, offset)
    offset += 176
  }
  const renderColumnHeader = (column: (typeof visibleColumns)[number]) => {
    const active = sortBy === column.field
    const Icon = active ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown
    return (
      <button
        aria-label={column.label || `Column ${column.field}`}
        className="inline-flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        disabled={!column.semantic_field}
        onClick={() => column.semantic_field && onSort(column.semantic_field)}
        type="button"
      >
        <span className="flex items-center gap-1.5 whitespace-pre-line normal-case tracking-normal">{column.formula ? <FunctionSquare aria-hidden="true" className="size-3.5 text-primary" /> : null}{column.label}</span>
        {column.semantic_field ? <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-60" /> : null}
      </button>
    )
  }
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
          header: () => {
            const active = sortBy === column.field
            const Icon = active ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown
            return (
              <button
                aria-label={column.label}
                className="inline-flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={!column.semantic_field}
                onClick={() => column.semantic_field && onSort(column.semantic_field)}
                type="button"
              >
                <span className="flex items-center gap-1.5">{column.formula ? <FunctionSquare aria-hidden="true" className="size-3.5 text-primary" /> : null}{column.label}</span>
                {column.semantic_field ? <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-60" /> : null}
              </button>
            )
          },
          cell: ({ row }) => {
            const record = row.original
            const field = column.field
            if (column.editable) {
              const rawValue = record.values[field]
              const error = errors.get(`${record.row_number}:${field}`)
              let inputValue = rawValue == null ? "" : String(rawValue)
              if (column.data_type === "currency" && typeof rawValue === "number") inputValue = formatCurrency(rawValue)
              if (column.data_type === "date" && rawValue) inputValue = String(rawValue).slice(0, 10)
              return (
                <div className="min-w-40 px-2 py-1.5"><Input
                  aria-invalid={Boolean(error)}
                  aria-label={`${column.label}, ${rowLabel.replace("{row}", String(record.row_number))}`}
                  className={cn("h-9", (column.data_type === "currency" || column.data_type === "number") && "text-right tabular-nums", error && "border-destructive")}
                  disabled={record.editable[field] === false}
                  inputMode={column.data_type === "currency" || column.data_type === "number" ? "numeric" : undefined}
                  onChange={(event) => onDraftChange(record.row_number, field, event.target.value)}
                  type={column.data_type === "date" ? "date" : "text"}
                  value={drafts.get(record.row_number)?.[field] ?? inputValue}
                />{error ? <p className="mt-1 text-xs text-destructive" role="alert">{error}</p> : null}</div>
              )
            }
            const value = record.values[field]
            let display = value == null || value === "" ? "—" : String(value)
            if (column.data_type === "currency" && typeof value === "number") display = formatCurrency(value)
            if (column.data_type === "date" && value) {
              const date = new Date(String(value)); if (!Number.isNaN(date.getTime())) display = new Intl.DateTimeFormat("en-GB").format(date)
            }
            return <span className={cn("block min-w-32 px-4 py-3 text-sm", (column.data_type === "currency" || column.data_type === "number") && "text-right tabular-nums", column.formula && "bg-primary/[0.035] font-medium text-foreground/80")}>{display}</span>
          },
        }),
      ),
    [drafts, errors, onDraftChange, onSort, visibleColumns, rowLabel, sortBy, sortDirection],
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
