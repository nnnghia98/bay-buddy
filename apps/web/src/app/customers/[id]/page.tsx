"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { useCustomerLedger } from "@/hooks/use-customer-ledger"
import { useI18n } from "@/locales/client"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatSignedCurrency(amount: number): string {
  if (amount === 0) {
    return formatCurrency(amount)
  }

  const sign = amount > 0 ? "+" : "-"
  return `${sign}${formatCurrency(Math.abs(amount))}`
}

function formatDate(value: Date): string {
  const day = value.getDate().toString().padStart(2, "0")
  const month = (value.getMonth() + 1).toString().padStart(2, "0")
  const year = value.getFullYear()
  const hours = value.getHours().toString().padStart(2, "0")
  const minutes = value.getMinutes().toString().padStart(2, "0")

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export default function CustomerLedgerPage() {
  const t = useI18n()
  const params = useParams<{ id: string }>()
  const customerId = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const { token, isReady, logout } = useAuth()

  const ledgerQuery = useCustomerLedger(customerId, isReady && Boolean(token))

  React.useEffect(() => {
    if (isReady && !token) {
      router.replace("/login")
    }
  }, [isReady, router, token])

  React.useEffect(() => {
    if (ledgerQuery.error instanceof ApiError && ledgerQuery.error.status === 401) {
      logout()
      router.replace("/login")
    }
  }, [ledgerQuery.error, logout, router])

  if (!isReady || !token) {
    return null
  }

  if (ledgerQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-700 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("customers.ledger.loading")}
        </div>
      </div>
    )
  }

  if (ledgerQuery.isError || !ledgerQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4">
        <div className="max-w-md rounded-[2rem] border border-red-100 bg-white/90 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-slate-900">
            {t("customers.ledger.unavailableTitle")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t("customers.ledger.unavailableDescription")}
          </p>
        </div>
      </div>
    )
  }

  const ledger = ledgerQuery.data

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Button asChild className="w-fit" size="sm" variant="outline">
                <Link href="/customers">
                  <ArrowLeft className="h-4 w-4" />
                  {t("customers.ledger.back")}
                </Link>
              </Button>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-700">
                  {t("customers.ledger.eyebrow")}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight">
                  {ledger.customer.name}
                </h1>
                <p className="text-sm text-slate-500">
                  {t("customers.ledger.customerId")}: {ledger.customer.id}
                </p>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200 bg-slate-50/90 p-6">
              <p className="text-sm font-medium text-slate-500">
                {t("customers.ledger.currentBalance")}
              </p>
              <p
                className={cn(
                  "mt-3 text-3xl font-semibold tracking-tight",
                  ledger.current_balance > 0
                    ? "text-red-600"
                    : ledger.current_balance < 0
                      ? "text-emerald-600"
                      : "text-slate-900",
                )}
              >
                {formatCurrency(ledger.current_balance)}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-2xl shadow-slate-900/5 backdrop-blur">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("customers.ledger.tableTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("customers.ledger.tableDescription")}
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead>{t("customers.ledger.columns.date")}</TableHead>
                <TableHead>{t("customers.ledger.columns.content")}</TableHead>
                <TableHead className="text-right">
                  {t("customers.ledger.columns.amount")}
                </TableHead>
                <TableHead className="text-right">
                  {t("customers.ledger.columns.balance")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.entries.length === 0 ? (
                <TableRow>
                  <TableCell className="py-10 text-center text-slate-500" colSpan={4}>
                    {t("customers.ledger.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                ledger.entries.map((entry) => (
                  <TableRow
                    key={`${entry.entry_type}-${entry.id}`}
                    className="border-slate-100 hover:bg-slate-50/60"
                  >
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {entry.content.trim() || t("customers.ledger.fallbackContent")}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        entry.amount > 0
                          ? "text-red-600"
                          : entry.amount < 0
                            ? "text-emerald-600"
                            : "text-slate-500",
                      )}
                    >
                      {formatSignedCurrency(entry.amount)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        entry.running_balance > 0
                          ? "text-red-600"
                          : entry.running_balance < 0
                            ? "text-emerald-600"
                            : "text-slate-700",
                      )}
                    >
                      {formatCurrency(entry.running_balance)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  )
}
