import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getI18n } from "@/locales/server"
import { fetchInvoiceDetail } from "@/lib/server-finance"
import { cn } from "@/lib/utils"
import type { InvoiceDetail } from "@/schemas"

type PageProps = {
  params: Promise<{ id: string }>
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value)
}

function getStatusClass(status: InvoiceDetail["status"]): string {
  switch (status) {
    case "ISSUED":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "CANCELLED":
      return "border-rose-200 bg-rose-50 text-rose-700"
    default:
      return "border-amber-200 bg-amber-50 text-amber-700"
  }
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const t = await getI18n()
  const { id: invoiceId } = await params
  const invoice = await fetchInvoiceDetail(invoiceId)

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 text-foreground">
      <section className="rounded-[28px] border border-border bg-white p-6 shadow-[var(--shadow-lg),var(--theme-shadow-soft)] lg:p-8">
        <div className="space-y-4">
          <div className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-accent/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t("financeDocuments.invoices.detail.eyebrow")}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-medium tracking-[-0.03em] text-foreground">
                {t("financeDocuments.invoices.detail.titlePrefix")}{" "}
                {invoice.invoice_number}
              </h1>
              <div className="flex flex-wrap gap-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                    getStatusClass(invoice.status),
                  )}
                >
                  {t(`financeDocuments.statuses.invoice.${invoice.status}`)}
                </span>
                <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.createdAt")}:{" "}
                  {formatDateTime(invoice.created_at)}
                </span>
              </div>
            </div>

            <Button asChild variant="outline">
              <Link href={`/invoices/${invoice.id}/public`}>
                {t("financeDocuments.invoices.detail.publicLink")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="border border-border bg-white">
          <CardHeader>
            <CardTitle>{t("financeDocuments.common.customer")}</CardTitle>
            <CardDescription>{invoice.customer_name_snapshot}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-secondary/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("financeDocuments.common.address")}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {invoice.customer_address_snapshot ?? t("financeDocuments.common.notUpdated")}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("financeDocuments.common.taxCode")}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {invoice.customer_tax_code_snapshot ?? t("financeDocuments.common.notUpdated")}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("financeDocuments.common.note")}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {invoice.note ?? t("financeDocuments.common.noNote")}
              </p>
            </div>
            {invoice.issued_at ? (
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.issuedAt")}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {formatDateTime(invoice.issued_at)}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border border-border bg-white">
          <CardHeader>
            <CardTitle>{t("financeDocuments.common.amountInWords")}</CardTitle>
            <CardDescription>
              {t("financeDocuments.common.snapshotNotice")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("financeDocuments.common.amountInWords")}
              </p>
              <p className="mt-2 text-base leading-7 text-foreground">
                {invoice.amount_in_words}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.taxAmount")}
                </p>
                <p className="mt-2 text-base font-medium text-foreground">
                  {formatCurrency(invoice.tax_amount)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.discountAmount")}
                </p>
                <p className="mt-2 text-base font-medium text-foreground">
                  {formatCurrency(invoice.discount_amount)}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.total")}
                </p>
                <p className="mt-2 text-base font-medium text-foreground">
                  {formatCurrency(invoice.total_amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-border bg-white shadow-[var(--shadow-lg),var(--theme-shadow-soft)]">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-2xl font-medium tracking-[-0.02em] text-foreground">
            {t("financeDocuments.invoices.detail.lineItemsTitle")}
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60 hover:bg-secondary/60">
              <TableHead>{t("financeDocuments.common.columns.description")}</TableHead>
              <TableHead>{t("financeDocuments.common.columns.passenger")}</TableHead>
              <TableHead className="text-right">{t("financeDocuments.common.columns.quantity")}</TableHead>
              <TableHead className="text-right">{t("financeDocuments.common.columns.unitPrice")}</TableHead>
              <TableHead className="text-right">{t("financeDocuments.common.columns.total")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-[28rem]">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{item.description}</p>
                    {item.linked_ticket_id ? (
                      <p className="text-xs text-muted-foreground">{item.linked_ticket_id}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{item.passenger_name_snapshot}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unit_price_snapshot)}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
