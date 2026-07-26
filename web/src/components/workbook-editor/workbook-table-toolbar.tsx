"use client"

import * as React from "react"
import { Search, Table2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
    <div className="flex flex-col gap-3 border-b border-border bg-secondary/15 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-sm border border-border bg-white text-primary">
          <Table2 aria-hidden="true" className="size-3.5" />
        </span>
        <p className="min-w-0 truncate text-sm font-semibold text-foreground">{sheetLabel}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-end">
        {columnControls}
        <form
          className="flex min-w-0 flex-1 gap-2 md:max-w-sm"
          onSubmit={(event) => {
            event.preventDefault()
            onSearch(value)
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={searchLabel}
              className="h-9 bg-white pl-9 shadow-none"
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
