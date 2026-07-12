"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export function WorkbookPagination({
  nextLabel,
  onPageChange,
  page,
  pageLabel,
  previousLabel,
  total,
  totalLabel,
  totalPages,
}: {
  nextLabel: string
  onPageChange: (page: number) => void
  page: number
  pageLabel: string
  previousLabel: string
  total: number
  totalLabel: string
  totalPages: number
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">{totalLabel.replace("{total}", String(total))}</p>
      <div className="flex items-center justify-end gap-2">
        <Button
          aria-label={previousLabel}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">{previousLabel}</span>
        </Button>
        <span className="min-w-24 text-center font-medium tabular-nums text-foreground">
          {pageLabel.replace("{page}", String(page)).replace("{total}", String(totalPages || 1))}
        </span>
        <Button
          aria-label={nextLabel}
          disabled={totalPages === 0 || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <span className="hidden sm:inline">{nextLabel}</span>
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
