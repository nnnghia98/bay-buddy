"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import {
  CommandPanel,
  CommandPanelHeader,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError, apiFetchData } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { CustomerDirectoryItemSchema, type CustomerDirectoryItem } from "@/schemas"

const customerDirectorySchema = z.array(CustomerDirectoryItemSchema)

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

async function fetchCustomers(): Promise<CustomerDirectoryItem[]> {
  const payload = await apiFetchData<unknown>("/customers/")
  return customerDirectorySchema.parse(payload)
}

export default function CustomersPage() {
  const t = useI18n()
  const router = useRouter()
  const { token, isReady, logout } = useAuth()
  const [searchValue, setSearchValue] = React.useState("")
  const deferredSearchValue = React.useDeferredValue(searchValue)

  const customersQuery = useQuery({
    queryKey: ["customers-directory"],
    queryFn: fetchCustomers,
    enabled: isReady && Boolean(token),
  })

  React.useEffect(() => {
    if (isReady && !token) {
      router.replace("/login")
    }
  }, [isReady, router, token])

  React.useEffect(() => {
    if (customersQuery.error instanceof ApiError && customersQuery.error.status === 401) {
      logout()
      router.replace("/login")
    }
  }, [customersQuery.error, logout, router])

  const normalizedSearch = deferredSearchValue.trim().toLowerCase()

  const filteredCustomers = !normalizedSearch
    ? customersQuery.data ?? []
    : (customersQuery.data ?? []).filter((customer) => {
        const fullName = customer.full_name.toLowerCase()
        const phone = customer.phone?.toLowerCase() ?? ""

        return fullName.includes(normalizedSearch) || phone.includes(normalizedSearch)
      })

  const directoryStats = React.useMemo(() => {
    const customers = customersQuery.data ?? []

    const outstanding = customers.reduce((sum, customer) => {
      return customer.current_balance > 0 ? sum + customer.current_balance : sum
    }, 0)

    const credit = customers.reduce((sum, customer) => {
      return customer.current_balance < 0 ? sum + Math.abs(customer.current_balance) : sum
    }, 0)

    return {
      totalCustomers: customers.length,
      outstanding,
      credit,
    }
  }, [customersQuery.data])

  if (!isReady || !token) {
    return null
  }

  const customerRows = customersQuery.isLoading ? (
    <TableRow>
      <TableCell className="py-12 text-center text-muted-foreground" colSpan={3}>
        {t("customers.directory.loading")}
      </TableCell>
    </TableRow>
  ) : customersQuery.isError ? (
    <TableRow>
      <TableCell className="py-12 text-center text-red-600" colSpan={3}>
        {t("customers.directory.error")}
      </TableCell>
    </TableRow>
  ) : filteredCustomers.length === 0 ? (
    <TableRow>
      <TableCell className="py-12 text-center text-muted-foreground" colSpan={3}>
        {t("customers.directory.empty")}
      </TableCell>
    </TableRow>
  ) : (
    filteredCustomers.map((customer) => (
      <TableRow
        key={customer.id}
        className="cursor-pointer hover:bg-accent/45"
        onClick={() => router.push(`/customers/${customer.id}`)}
      >
        <TableCell className="px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-accent text-sm font-semibold text-primary">
              {getInitials(customer.full_name)}
            </div>
            <div className="space-y-1">
              <div className="font-medium text-foreground">{customer.full_name}</div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("customers.ledger.customerId")}: {customer.id.slice(0, 8)}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="px-6 py-5 text-muted-foreground">
          {customer.phone ? customer.phone : t("financeDocuments.common.notUpdated")}
        </TableCell>
        <TableCell
          className={cn(
            "px-6 py-5 text-right font-semibold",
            customer.current_balance > 0
              ? "text-red-600"
              : customer.current_balance < 0
                ? "text-primary"
                : "text-foreground",
          )}
        >
          <div className="inline-flex items-center justify-end gap-2">
            {customer.current_balance < 0 ? (
              <StatusChip tone="info">
                {t("customers.ledger.balanceStates.credit")}
              </StatusChip>
            ) : null}
            <span>{formatCurrency(Math.abs(customer.current_balance))}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </TableCell>
      </TableRow>
    ))
  )

  return (
    <div className="space-y-4 text-foreground">
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("customers.directory.eyebrow")}
          title={t("customers.directory.title")}
          description={t("customers.directory.description")}
          action={
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t("customers.directory.searchPlaceholder")}
                value={searchValue}
              />
            </div>
          }
        />
        <div className="grid gap-3 border-b border-border px-4 py-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("customers.directory.metrics.totalCustomers")}
            </p>
            <p className="mt-2 text-2xl font-medium text-foreground">
              {directoryStats.totalCustomers}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("dashboard.summary.widgets.receivables.label")}
            </p>
            <p className="mt-2 text-2xl font-medium text-foreground">
              {formatCurrency(directoryStats.outstanding)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("customers.ledger.balanceStates.credit")}
            </p>
            <p className="mt-2 text-2xl font-medium text-foreground">
              {formatCurrency(directoryStats.credit)}
            </p>
          </div>
        </div>
        <TableScrollArea>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/55 hover:bg-secondary/55">
                <TableHead>{t("financeDocuments.common.customer")}</TableHead>
                <TableHead>{t("customers.directory.columns.phone")}</TableHead>
                <TableHead className="text-right">
                  {t("customers.ledger.currentBalance")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{customerRows}</TableBody>
          </Table>
        </TableScrollArea>
      </CommandPanel>
    </div>
  )
}
