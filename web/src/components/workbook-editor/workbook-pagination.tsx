"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import styles from "./workbook-editor-components.module.css"

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
    <div className={styles.pagination}>
      <p className={styles.paginationMeta}>
        {totalLabel.replace("{total}", String(total))}
      </p>
      <div className={styles.paginationActions}>
        <Button
          aria-label={previousLabel}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" className={styles.icon} />
          <span className={styles.desktopLabel}>{previousLabel}</span>
        </Button>
        <span className={styles.pageIndicator}>
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
          <span className={styles.desktopLabel}>{nextLabel}</span>
          <ChevronRight aria-hidden="true" className={styles.icon} />
        </Button>
      </div>
    </div>
  )
}
