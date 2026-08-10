"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { ListFilter, Plus, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { selectInputClassName } from "@/components/operations-ui"
import { useI18n } from "@/locales/client"
import {
  getTicketDebtFilterCount,
  isTicketDebtMoneyFilterColumn,
  ticketDebtFilterColumns,
  type TicketDebtFilterColumn,
  type TicketDebtFilters,
  type TicketDebtMoneyFilter,
  type TicketDebtPaymentMethodFilter,
} from "@/lib/ticket-debt-filters"
import { cn } from "@/lib/utils"
import styles from "./manual-debt-filter-bar.module.css"

type FilterRow = {
  column: TicketDebtFilterColumn
  id: number
  value: string
}

type ManualDebtFilterBarProps = {
  filters: TicketDebtFilters
  onFiltersChange: (filters: TicketDebtFilters) => void
  onSearchChange: (value: string) => void
  searchValue: string
}

function getLocalDateToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const getPart = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? ""

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`
}

function getDefaultFilterValue(column: TicketDebtFilterColumn): string {
  if (column === "booked_at") {
    return getLocalDateToday()
  }

  if (column === "payment_method") {
    return "none"
  }

  return "positive"
}

function filterRowsToFilters(rows: FilterRow[]): TicketDebtFilters {
  const filters: TicketDebtFilters = {}

  rows.forEach((row) => {
    if (!row.value) {
      return
    }

    if (row.column === "booked_at") {
      filters.booked_at = row.value
      return
    }

    if (row.column === "payment_method") {
      filters.payment_method = row.value as TicketDebtPaymentMethodFilter
      return
    }

    filters[row.column] = row.value as TicketDebtMoneyFilter
  })

  return filters
}

export function ManualDebtFilterBar({
  filters,
  onFiltersChange,
  onSearchChange,
  searchValue,
}: ManualDebtFilterBarProps) {
  const t = useI18n()
  const nextFilterIdRef = React.useRef(0)
  const [isOpen, setIsOpen] = React.useState(false)
  const [draftRows, setDraftRows] = React.useState<FilterRow[]>([])
  const activeFilterCount = getTicketDebtFilterCount(filters)
  const paymentMethodLabels: Record<
    TicketDebtPaymentMethodFilter,
    string
  > = {
    none: t("manualDebts.emptyValue"),
    "Chuyển khoản": t(
      "customers.ledger.paymentDialog.fields.methodOptions.bankTransfer",
    ),
    "Tiền mặt": t("customers.ledger.paymentDialog.fields.methodOptions.cash"),
    AST: t("customers.ledger.paymentDialog.fields.methodOptions.ast"),
    THF: t("customers.ledger.paymentDialog.fields.methodOptions.thf"),
  }
  const columnLabels: Record<TicketDebtFilterColumn, string> = {
    booked_at: t("manualDebts.table.columns.bookedAt"),
    payment_method: t("manualDebts.table.columns.paymentMethod"),
    ev_price: t("manualDebts.table.columns.evPrice"),
    ast_price: t("manualDebts.table.columns.astPrice"),
    thf_price: t("manualDebts.table.columns.thfPrice"),
    web_price: t("manualDebts.table.columns.webPrice"),
    insurance_price: t("manualDebts.table.columns.insurancePrice"),
    selling_price: t("manualDebts.table.columns.sellingPrice"),
  }

  const createFilterRow = React.useCallback(
    (column: TicketDebtFilterColumn): FilterRow => {
      nextFilterIdRef.current += 1
      return {
        column,
        id: nextFilterIdRef.current,
        value: getDefaultFilterValue(column),
      }
    },
    [],
  )

  const createRowsFromFilters = React.useCallback((): FilterRow[] => {
    const rows = ticketDebtFilterColumns.flatMap((column) => {
      const value = filters[column]
      if (!value) {
        return []
      }

      nextFilterIdRef.current += 1
      return [{ column, id: nextFilterIdRef.current, value }]
    })

    return rows.length > 0 ? rows : [createFilterRow("booked_at")]
  }, [createFilterRow, filters])

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftRows(createRowsFromFilters())
    }
    setIsOpen(nextOpen)
  }

  const handleColumnChange = (
    rowId: number,
    column: TicketDebtFilterColumn,
  ) => {
    setDraftRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? { ...row, column, value: getDefaultFilterValue(column) }
          : row,
      ),
    )
  }

  const handleValueChange = (rowId: number, value: string) => {
    setDraftRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, value } : row)),
    )
  }

  const usedColumns = new Set(draftRows.map((row) => row.column))
  const canAddFilter = draftRows.length < ticketDebtFilterColumns.length
  const canApply = draftRows.every((row) => row.value.length > 0)

  const addFilter = () => {
    const nextColumn = ticketDebtFilterColumns.find(
      (column) => !usedColumns.has(column),
    )
    if (nextColumn) {
      setDraftRows((current) => [...current, createFilterRow(nextColumn)])
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <div
        aria-label={t("manualDebts.filters.barLabel")}
        className={styles.filterBar}
        role="search"
      >
        <div className={styles.searchField}>
          <Label className={patterns.eyebrow} htmlFor="manual-debt-search">
            {t("manualDebts.filters.searchLabel")}
          </Label>
          <div className={styles.controlWrap}>
            <Search aria-hidden="true" className={styles.controlIcon} />
            <Input
              aria-label={t("manualDebts.filters.searchLabel")}
              className={styles.searchInput}
              id="manual-debt-search"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("manualDebts.filters.searchPlaceholder")}
              type="search"
              value={searchValue}
            />
          </div>
        </div>

        <div className={styles.filterAction}>
          <DialogTrigger asChild>
            <Button
              className={styles.filterButton}
              data-active={activeFilterCount > 0}
              type="button"
              variant="outline"
            >
              <ListFilter className={patterns.iconSmall} />
              {t("manualDebts.filters.open")}
              {activeFilterCount > 0 ? (
                <span className={styles.filterCount}>{activeFilterCount}</span>
              ) : null}
            </Button>
          </DialogTrigger>
        </div>
      </div>

      <DialogContent maxHeight="min(88dvh, 46rem)" width="min(94vw, 44rem)">
        <DialogHeader>
          <DialogTitle>{t("manualDebts.filters.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("manualDebts.filters.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className={styles.dialogBody}>
          {draftRows.length > 0 ? (
            <div className={styles.filterList}>
              {draftRows.map((row) => (
                <div className={styles.filterRow} key={row.id}>
                  <div className={cn(styles.field, styles.columnField)}>
                    <Label htmlFor={`debt-filter-column-${row.id}`}>
                      {t("manualDebts.filters.column")}
                    </Label>
                    <select
                      className={selectInputClassName}
                      id={`debt-filter-column-${row.id}`}
                      onChange={(event) =>
                        handleColumnChange(
                          row.id,
                          event.target.value as TicketDebtFilterColumn,
                        )
                      }
                      value={row.column}
                    >
                      {ticketDebtFilterColumns.map((column) => (
                        <option
                          disabled={
                            column !== row.column && usedColumns.has(column)
                          }
                          key={column}
                          value={column}
                        >
                          {columnLabels[column]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={cn(styles.field, styles.valueField)}>
                    <Label htmlFor={`debt-filter-value-${row.id}`}>
                      {t("manualDebts.filters.condition")}
                    </Label>
                    {row.column === "booked_at" ? (
                      <Input
                        id={`debt-filter-value-${row.id}`}
                        onChange={(event) =>
                          handleValueChange(row.id, event.target.value)
                        }
                        type="date"
                        value={row.value}
                      />
                    ) : row.column === "payment_method" ? (
                      <select
                        className={selectInputClassName}
                        id={`debt-filter-value-${row.id}`}
                        onChange={(event) =>
                          handleValueChange(row.id, event.target.value)
                        }
                        value={row.value}
                      >
                        {Object.entries(paymentMethodLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    ) : isTicketDebtMoneyFilterColumn(row.column) ? (
                      <select
                        className={selectInputClassName}
                        id={`debt-filter-value-${row.id}`}
                        onChange={(event) =>
                          handleValueChange(row.id, event.target.value)
                        }
                        value={row.value}
                      >
                        <option value="positive">
                          {t("manualDebts.filters.money.positive")}
                        </option>
                        <option value="zero">
                          {t("manualDebts.filters.money.zero")}
                        </option>
                      </select>
                    ) : null}
                  </div>

                  <Button
                    aria-label={t("manualDebts.filters.removeCondition")}
                    className={styles.removeButton}
                    onClick={() =>
                      setDraftRows((current) =>
                        current.filter((filterRow) => filterRow.id !== row.id),
                      )
                    }
                    size="icon"
                    title={t("manualDebts.filters.removeCondition")}
                    type="button"
                    variant="ghost"
                  >
                    <X className={patterns.iconCompact} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyFilters}>
              {t("manualDebts.filters.empty")}
            </p>
          )}

          <Button
            className={styles.addButton}
            disabled={!canAddFilter}
            onClick={addFilter}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className={patterns.iconSmall} />
            {t("manualDebts.filters.addCondition")}
          </Button>
        </div>

        <DialogFooter>
          <Button
            disabled={activeFilterCount === 0}
            onClick={() => {
              onFiltersChange({})
              setIsOpen(false)
            }}
            type="button"
            variant="ghost"
          >
            {t("manualDebts.filters.reset")}
          </Button>
          <Button
            onClick={() => setIsOpen(false)}
            type="button"
            variant="outline"
          >
            {t("manualDebts.filters.cancel")}
          </Button>
          <Button
            disabled={!canApply}
            onClick={() => {
              onFiltersChange(filterRowsToFilters(draftRows))
              setIsOpen(false)
            }}
            type="button"
          >
            {t("manualDebts.filters.applyFilters")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
