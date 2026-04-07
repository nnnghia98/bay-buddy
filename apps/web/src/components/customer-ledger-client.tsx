"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PaymentDialog } from "@/components/payment-dialog"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { convert_number_to_vn_words } from "@/lib/number-to-vn-words"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import type { CustomerLedger } from "@/schemas"

type CustomerLedgerClientProps = {
  customerId: string
  initialLedger: CustomerLedger | null
}

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

function buildOptimisticLedger(
  ledger: CustomerLedger,
  optimisticPayment: { amount: number; note: string },
): CustomerLedger {
  const optimisticEntry = {
    id: `optimistic-${Date.now()}`,
    entry_type: "payment" as const,
    created_at: new Date(),
    content: optimisticPayment.note,
    amount: -optimisticPayment.amount,
    running_balance: 0,
  }

  const nextEntries = [...ledger.entries, optimisticEntry].sort((left, right) => {
    const leftTimestamp = left.created_at.getTime()
    const rightTimestamp = right.created_at.getTime()

    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp - rightTimestamp
    }

    if (left.entry_type === right.entry_type) {
      return String(left.id).localeCompare(String(right.id))
    }

    return left.entry_type === "ticket" ? -1 : 1
  })

  let runningBalance = 0
  const entriesWithBalance = nextEntries.map((entry) => {
    runningBalance += entry.amount
    return {
      ...entry,
      running_balance: runningBalance,
    }
  })

  return {
    ...ledger,
    current_balance: runningBalance,
    balance_state:
      runningBalance > 0 ? "debt" : runningBalance < 0 ? "credit" : "settled",
    entries: entriesWithBalance,
  }
}

export function CustomerLedgerClient({
  customerId,
  initialLedger,
}: CustomerLedgerClientProps) {
  const t = useI18n()
  const emptyLedger = React.useMemo<CustomerLedger>(
    () => ({
      customer: {
        id: customerId,
        name: "",
        type: "INDIVIDUAL",
        balance: 0,
      },
      current_balance: 0,
      balance_state: "settled",
      entries: [],
    }),
    [customerId],
  )
  const [confirmedLedger, setConfirmedLedger] = React.useState<CustomerLedger>(
    initialLedger ?? emptyLedger,
  )

  React.useEffect(() => {
    if (initialLedger) {
      setConfirmedLedger(initialLedger)
      return
    }

    setConfirmedLedger(emptyLedger)
  }, [emptyLedger, initialLedger])

  const [optimisticLedger, addOptimisticPayment] = React.useOptimistic(
    confirmedLedger,
    buildOptimisticLedger,
  )

  const handleOptimisticSubmit = React.useCallback(
    (payment: { amount: number; note: string }) => {
      React.startTransition(() => {
        addOptimisticPayment(payment)
      })
    },
    [addOptimisticPayment],
  )

  const handleActionSettled = React.useCallback((status: "success" | "error") => {
    if (status === "error") {
      setConfirmedLedger((currentLedger) => ({
        ...currentLedger,
        entries: [...currentLedger.entries],
      }))
    }
  }, [])

  if (!initialLedger) {
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

  const ledger = optimisticLedger
  const currentBalanceInWords = convert_number_to_vn_words(
    Math.abs(ledger.current_balance),
  )
  const ticketOptions = confirmedLedger.entries
    .filter((entry) => entry.entry_type === "ticket")
    .map((entry) => ({
      id: entry.id,
      label: entry.content.trim() || entry.id,
    }))
  const balanceStateLabels = {
    debt: t("customers.ledger.balanceStates.debt"),
    settled: t("customers.ledger.balanceStates.settled"),
    credit: t("customers.ledger.balanceStates.credit"),
  } as const

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

              <PaymentDialog
                customerId={customerId}
                onOptimisticSubmit={handleOptimisticSubmit}
                onSettled={handleActionSettled}
                ticketOptions={ticketOptions}
              />
            </div>

            <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200 bg-slate-50/90 p-6">
              <p className="text-sm font-medium text-slate-500">
                {t("customers.ledger.currentBalance")}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    optimisticLedger.balance_state === "debt"
                      ? "bg-red-100 text-red-700"
                      : optimisticLedger.balance_state === "credit"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-700",
                  )}
                >
                  {balanceStateLabels[optimisticLedger.balance_state]}
                </span>
              </div>
              <p
                className={cn(
                  "mt-3 text-3xl font-semibold tracking-tight",
                  optimisticLedger.current_balance > 0
                    ? "text-red-600"
                    : optimisticLedger.current_balance < 0
                      ? "text-emerald-600"
                      : "text-slate-900",
                )}
              >
                {formatCurrency(Math.abs(optimisticLedger.current_balance))}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t("customers.ledger.amountInWords")}: {currentBalanceInWords}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-slate-900/5 backdrop-blur">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-900">
              {t("customers.ledger.tableTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("customers.ledger.tableDescription")}
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell className="py-12 text-center text-slate-500" colSpan={4}>
                      {t("customers.ledger.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  ledger.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-sm text-slate-500">
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
                              : "text-slate-700",
                        )}
                      >
                        {formatSignedCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        {formatCurrency(entry.running_balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  )
}
