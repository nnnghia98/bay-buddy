"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Landmark,
  Receipt,
  Sparkles,
  WalletCards,
} from "lucide-react"

import { PaymentDialog } from "@/components/payment-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
      <div className="flex min-h-[50vh] items-center justify-center bg-[radial-gradient(circle_at_top,_color-mix(in_srgb,var(--primary)_16%,transparent),_transparent_28%),linear-gradient(180deg,_var(--background)_0%,_color-mix(in_srgb,var(--accent)_22%,white)_100%)] px-4">
        <Card className="max-w-md border border-border/80 p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            {t("customers.ledger.unavailableTitle")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t("customers.ledger.unavailableDescription")}
          </p>
        </Card>
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
  const paymentCount = ledger.entries.filter(
    (entry) => entry.entry_type === "payment",
  ).length
  const ticketCount = ledger.entries.filter(
    (entry) => entry.entry_type === "ticket",
  ).length
  const latestEntry = ledger.entries.at(-1)
  const overviewCards = [
    {
      icon: Receipt,
      label: t("customers.ledger.tableTitle"),
      value: `${ticketCount}`,
      detail: t("customers.ledger.columns.content"),
    },
    {
      icon: WalletCards,
      label: t("customers.ledger.paymentDialog.title"),
      value: `${paymentCount}`,
      detail: latestEntry ? formatDate(latestEntry.created_at) : "No activity yet",
    },
    {
      icon: Building2,
      label: t("customers.ledger.balanceStates.settled"),
      value: ledger.customer.type,
      detail: `${t("customers.ledger.customerId")}: ${ledger.customer.id.slice(0, 8)}`,
    },
  ]

  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_color-mix(in_srgb,var(--primary)_16%,transparent),_transparent_28%),linear-gradient(180deg,_var(--background)_0%,_color-mix(in_srgb,var(--accent)_22%,white)_100%)] px-4 py-8 text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_18%_22%,color-mix(in_srgb,var(--accent)_28%,transparent),transparent_42%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-32 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute left-[-6rem] top-[28rem] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="group relative overflow-hidden border border-border/60 bg-card/95 p-6 lg:col-span-7 lg:p-8">
            <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-r from-primary/12 via-chart-2/10 to-transparent" />
            <div className="relative space-y-6">
              <Button asChild className="group w-fit" size="sm" variant="outline">
                <Link href="/customers">
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  {t("customers.ledger.back")}
                </Link>
              </Button>

              <div className="space-y-4">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  <Sparkles className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  {t("customers.ledger.eyebrow")}
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
                    {ledger.customer.name}
                  </h1>
                  <p className="max-w-xl text-base leading-[1.6] text-slate-600">
                    {t("customers.ledger.customerId")}: {ledger.customer.id}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <PaymentDialog
                  customerId={customerId}
                  onOptimisticSubmit={handleOptimisticSubmit}
                  onSettled={handleActionSettled}
                  ticketOptions={ticketOptions}
                />
              </div>
            </div>
          </Card>

          <div className="lg:col-span-5 [perspective:2000px]">
            <Card className="group relative overflow-hidden border-0 bg-linear-to-br from-primary via-primary to-chart-2 text-primary-foreground shadow-[var(--shadow-lg),0_18px_40px_-20px_color-mix(in_srgb,var(--primary)_36%,transparent)] [transform:rotateX(5deg)_rotateY(-12deg)] hover:[transform:rotateX(2deg)_rotateY(-8deg)_translateY(-4px)]">
              <div className="absolute -right-12 top-8 h-28 w-28 rounded-full bg-white/12 blur-2xl" />
              <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/10 blur-xl" />
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-sm font-medium text-primary-foreground/80">
                    {t("customers.ledger.currentBalance")}
                  </CardDescription>
                  <Landmark className="h-5 w-5 text-primary-foreground/80 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </CardHeader>
              <CardContent className="relative pt-0">
                <span className="inline-flex rounded-full bg-white/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/90">
                  {balanceStateLabels[optimisticLedger.balance_state]}
                </span>
                <p className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
                  {formatCurrency(Math.abs(optimisticLedger.current_balance))}
                </p>
                <p className="mt-3 text-sm leading-[1.6] text-primary-foreground/82">
                  {t("customers.ledger.amountInWords")}: {currentBalanceInWords}
                </p>
              </CardContent>
            </Card>
          </div>

          {overviewCards.map((item, index) => {
            const Icon = item.icon

            return (
              <Card
                key={item.label}
                className={cn(
                  "group relative overflow-hidden border border-border/60 bg-card/95 p-6 lg:col-span-4",
                  index % 2 === 0
                    ? "[transform:rotateY(4deg)] hover:[transform:rotateY(0deg)_translateY(-4px)]"
                    : "[transform:rotateY(-4deg)] hover:[transform:rotateY(0deg)_translateY(-4px)]",
                )}
              >
                <div className="absolute right-0 top-0 h-20 w-20 bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_26%,transparent),transparent_72%)] blur-2xl" />
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                    <p className="text-3xl font-semibold leading-[1.1] tracking-tight text-slate-900">
                      {item.value}
                    </p>
                    <p className="text-sm leading-[1.6] text-slate-500">{item.detail}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:-translate-y-0.5">
                    <Icon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="group relative overflow-hidden border border-border/70 bg-card/95 backdrop-blur">
          <div className="pointer-events-none absolute left-8 top-0 h-24 w-32 bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_20%,transparent),transparent_72%)] blur-3xl" />
          <CardHeader className="gap-3 border-b border-border/50 bg-primary/5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <CardDescription className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
                  {t("customers.ledger.eyebrow")}
                </CardDescription>
                <CardTitle className="text-[2rem] leading-[1.1] tracking-tight text-slate-900">
                  {t("customers.ledger.tableTitle")}
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-[1.6] text-slate-500">
                  {t("customers.ledger.tableDescription")}
                </CardDescription>
              </div>
              <div className="rounded-xl border border-border/50 bg-card px-4 py-3 shadow-[var(--shadow-sm)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {t("customers.ledger.currentBalance")}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {formatCurrency(Math.abs(ledger.current_balance))}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("customers.ledger.columns.date")}
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("customers.ledger.columns.content")}
                  </TableHead>
                  <TableHead className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("customers.ledger.columns.amount")}
                  </TableHead>
                  <TableHead className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
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
                    <TableRow
                      key={entry.id}
                      className="group border-border/40 hover:-translate-y-0.5 hover:bg-primary/5"
                    >
                      <TableCell className="whitespace-nowrap px-6 py-5 text-sm text-slate-500 transition-colors duration-200 group-hover:text-slate-700">
                        {formatDate(entry.created_at)}
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">
                            {entry.content.trim() || t("customers.ledger.fallbackContent")}
                          </p>
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 transition-colors duration-200 group-hover:text-primary/70">
                            {entry.entry_type}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-6 py-5 text-right font-semibold transition-colors duration-200",
                          entry.amount > 0
                            ? "text-slate-900"
                            : entry.amount < 0
                              ? "text-emerald-500"
                              : "text-slate-700",
                        )}
                      >
                        {formatSignedCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className="px-6 py-5 text-right font-medium text-slate-700 transition-colors duration-200 group-hover:text-slate-900">
                        {formatCurrency(entry.running_balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
