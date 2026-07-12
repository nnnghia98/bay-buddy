"use client"

import * as React from "react"
import { Search } from "lucide-react"

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
    <div className="flex flex-col gap-3 border-b border-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 truncate text-sm font-semibold text-foreground">{sheetLabel}</p>
      <div className="flex w-full flex-col gap-2 sm:max-w-2xl sm:flex-row sm:justify-end">
      {columnControls}
      <form
        className="flex w-full gap-2 sm:max-w-md"
        onSubmit={(event) => {
          event.preventDefault()
          onSearch(value)
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={searchLabel}
            className="h-10 pl-9"
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
