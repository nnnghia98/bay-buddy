"use client"

import * as React from "react"

import { PaymentDialog } from "@/components/payment-dialog"
import {
  CommandPanel,
  CommandPanelHeader,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
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
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("customers.ledger.eyebrow")}
          title={t("customers.ledger.unavailableTitle")}
          description={t("customers.ledger.unavailableDescription")}
        />
      </CommandPanel>
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

  const getEntryTypeLabel = (
    entryType: CustomerLedger["entries"][number]["entry_type"],
  ): string => {
    if (entryType === "ticket") {
      return t("customers.ledger.entryTypes.ticket")
    }

    if (entryType === "adjustment") {
      return t("customers.ledger.entryTypes.adjustment")
    }

    return t("customers.ledger.entryTypes.payment")
  }

  return (
    <div className="space-y-4 text-foreground">
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("customers.ledger.eyebrow")}
          title={ledger.customer.name}
          description={`${t("customers.ledger.customerId")}: ${ledger.customer.id}`}
          action={
            <PaymentDialog
              customerId={customerId}
              onOptimisticSubmit={handleOptimisticSubmit}
              onSettled={handleActionSettled}
              ticketOptions={ticketOptions}
            />
          }
        />
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t("customers.ledger.currentBalance")}
              </p>
              <p className="mt-2 text-2xl font-medium text-foreground">
                {formatCurrency(Math.abs(ledger.current_balance))}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t("financeDocuments.common.status")}
              </p>
              <div className="mt-2">
                <StatusChip
                  tone={
                    ledger.balance_state === "debt"
                      ? "danger"
                      : ledger.balance_state === "credit"
                        ? "info"
                        : "success"
                  }
                >
                  {balanceStateLabels[ledger.balance_state]}
                </StatusChip>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/35 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t("customers.ledger.entryCount")}
              </p>
              <p className="mt-2 text-2xl font-medium text-foreground">
                {ledger.entries.length}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("customers.ledger.amountInWords")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {currentBalanceInWords}
            </p>
          </div>
        </div>
      </CommandPanel>

      <CommandPanel>
        <CommandPanelHeader
          title={t("customers.ledger.tableTitle")}
          description={t("customers.ledger.tableDescription")}
        />
        <TableScrollArea>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/55 hover:bg-secondary/55">
                <TableHead>{t("customers.ledger.columns.date")}</TableHead>
                <TableHead>{t("customers.ledger.columns.type")}</TableHead>
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
                  <TableCell className="py-12 text-center text-muted-foreground" colSpan={5}>
                    {t("customers.ledger.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                ledger.entries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-accent/40">
                    <TableCell className="whitespace-nowrap px-6 py-5 text-sm text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <StatusChip
                        tone={
                          entry.entry_type === "ticket"
                            ? "warning"
                            : entry.entry_type === "adjustment"
                              ? "neutral"
                              : "info"
                        }
                      >
                        {getEntryTypeLabel(entry.entry_type)}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <p className="font-medium text-foreground">
                        {entry.content.trim() || t("customers.ledger.fallbackContent")}
                      </p>
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
        </TableScrollArea>
      </CommandPanel>
    </div>
  )
}
