"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { Search, Table2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import styles from "./workbook-editor-components.module.css"

export function WorkbookTableToolbar({
  onSearch,
  search,
  searchLabel,
  searchPlaceholder,
  sheetLabel,
  columnControls,
}: {
  columnControls?: React.ReactNode
  onSearch: (value: string) => void
  search: string
  searchLabel: string
  searchPlaceholder: string
  sheetLabel: string
}) {
  const [value, setValue] = React.useState(search)

  React.useEffect(() => setValue(search), [search])

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarIdentity}>
        <span className={styles.iconTile}>
          <Table2 aria-hidden="true" className={patterns.iconCompact} />
        </span>
        <p className={styles.toolbarTitle}>{sheetLabel}</p>
      </div>
      <div className={styles.toolbarActions}>
        {columnControls}
        <form
          className={styles.searchForm}
          onSubmit={(event) => {
            event.preventDefault()
            onSearch(value)
          }}
        >
          <div className={styles.searchField}>
            <Search aria-hidden="true" className={styles.searchIcon} />
            <Input
              aria-label={searchLabel}
              className={styles.searchInput}
              onChange={(event) => setValue(event.target.value)}
              placeholder={searchPlaceholder}
              value={value}
            />
          </div>
          <Button size="sm" type="submit" variant="outline">
            {searchLabel}
          </Button>
        </form>
      </div>
    </div>
  )
}
