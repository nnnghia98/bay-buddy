"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Landmark,
  Receipt,
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
import {
  applyOptimisticPaymentToLedger,
  cloneLedgerState,
} from "@/lib/finance-core"
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

function getEntryTypeLabel(entryType: CustomerLedger["entries"][number]["entry_type"]): string {
  const labels = {
    ticket: "Vé",
    payment: "Thanh toán",
    adjustment: "Điều chỉnh",
  } as const

  return labels[entryType]
}

function getCustomerTypeLabel(type: CustomerLedger["customer"]["type"]): string {
  return type === "BUSINESS" ? "Doanh nghiệp" : "Cá nhân"
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
    () => cloneLedgerState(initialLedger ?? emptyLedger),
  )

  React.useEffect(() => {
    if (initialLedger) {
      setConfirmedLedger(cloneLedgerState(initialLedger))
      return
    }

    setConfirmedLedger(cloneLedgerState(emptyLedger))
  }, [emptyLedger, initialLedger])

  const [optimisticLedger, addOptimisticPayment] = React.useOptimistic<
    CustomerLedger,
    { amount: number; note: string }
  >(
    confirmedLedger,
    (ledger, payment) => applyOptimisticPaymentToLedger(ledger, payment),
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
      setConfirmedLedger((currentLedger) => cloneLedgerState(currentLedger))
    }
  }, [])

  if (!initialLedger) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <Card className="max-w-md border border-border p-8 text-center">
          <h1 className="text-2xl font-medium text-foreground">
            {t("customers.ledger.unavailableTitle")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
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
      label: "Số vé đã ghi nhận",
      value: `${ticketCount}`,
      detail: "Bao gồm toàn bộ vé phát sinh công nợ của khách hàng này.",
    },
    {
      icon: WalletCards,
      label: "Giao dịch thanh toán",
      value: `${paymentCount}`,
      detail: latestEntry ? `Gần nhất: ${formatDate(latestEntry.created_at)}` : "Chưa có phát sinh mới.",
    },
    {
      icon: Building2,
      label: "Loại khách hàng",
      value: getCustomerTypeLabel(ledger.customer.type),
      detail: `${ledger.entries.length} dòng phát sinh trong sổ công nợ.`,
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-foreground">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border border-border bg-white">
          <CardHeader className="gap-5">
            <div className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-accent/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("customers.ledger.eyebrow")}
            </div>
            <div className="space-y-3">
              <CardTitle className="text-4xl leading-[1.08] sm:text-5xl">
                {ledger.customer.name}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-7">
                {t("customers.ledger.customerId")}: {ledger.customer.id}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <div className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {getCustomerTypeLabel(ledger.customer.type)}
              </div>
              <div className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {ledger.entries.length} dòng phát sinh
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/customers">
                  <ArrowLeft className="h-4 w-4" />
                  {t("customers.ledger.back")}
                </Link>
              </Button>

              <PaymentDialog
                customerId={customerId}
                onOptimisticSubmit={handleOptimisticSubmit}
                onSettled={handleActionSettled}
                ticketOptions={ticketOptions}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-primary/10 bg-[linear-gradient(180deg,#1b61c9_0%,#254fad_100%)] text-primary-foreground">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <CardDescription className="text-sm font-medium text-primary-foreground/82">
                {t("customers.ledger.currentBalance")}
              </CardDescription>
              <Landmark className="h-5 w-5 text-primary-foreground/84" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground">
              {balanceStateLabels[ledger.balance_state]}
            </span>
            <p className="mt-4 text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
              {formatCurrency(Math.abs(ledger.current_balance))}
            </p>
            <p className="mt-4 text-sm leading-7 text-primary-foreground/82">
              {t("customers.ledger.amountInWords")}: {currentBalanceInWords}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {overviewCards.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.label} className="border border-border bg-white">
              <CardContent className="flex items-start justify-between gap-4 p-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {item.label}
                  </p>
                  <p className="text-3xl font-medium tracking-[-0.02em] text-foreground">
                    {item.value}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <Card className="overflow-hidden border border-border bg-white">
        <CardHeader className="gap-4 border-b border-border bg-secondary/55">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("customers.ledger.eyebrow")}
              </CardDescription>
              <CardTitle className="text-[2rem] leading-[1.1]">
                {t("customers.ledger.tableTitle")}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-7">
                {t("customers.ledger.tableDescription")}
              </CardDescription>
            </div>
            <div className="rounded-[18px] border border-border bg-white px-4 py-3 shadow-[var(--shadow-sm)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("customers.ledger.currentBalance")}
              </p>
              <p className="mt-2 text-2xl font-medium tracking-[-0.02em] text-foreground">
                {formatCurrency(Math.abs(ledger.current_balance))}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 py-4">
                  {t("customers.ledger.columns.date")}
                </TableHead>
                <TableHead className="px-6 py-4">
                  {t("customers.ledger.columns.content")}
                </TableHead>
                <TableHead className="px-6 py-4 text-right">
                  {t("customers.ledger.columns.amount")}
                </TableHead>
                <TableHead className="px-6 py-4 text-right">
                  {t("customers.ledger.columns.balance")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.entries.length === 0 ? (
                <TableRow>
                  <TableCell className="py-12 text-center text-muted-foreground" colSpan={4}>
                    {t("customers.ledger.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                ledger.entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="hover:bg-accent/40"
                  >
                    <TableCell className="whitespace-nowrap px-6 py-5 text-sm text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">
                          {entry.content.trim() || t("customers.ledger.fallbackContent")}
                        </p>
                        <span className="inline-flex rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {getEntryTypeLabel(entry.entry_type)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "px-6 py-5 text-right font-semibold",
                        entry.amount > 0
                          ? "text-foreground"
                          : entry.amount < 0
                            ? "text-primary"
                            : "text-muted-foreground",
                      )}
                    >
                      {formatSignedCurrency(entry.amount)}
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right font-medium text-foreground">
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
  )
}
