import Link from "next/link"

import {
  Panel,
  PanelHeaderRow,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
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

function statusTone(
  status: InvoiceDetail["status"],
): "info" | "success" | "danger" | "warning" {
  switch (status) {
    case "ISSUED":
      return "info"
    case "PAID":
      return "success"
    case "CANCELLED":
      return "danger"
    default:
      return "warning"
  }
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const t = await getI18n()
  const { id: invoiceId } = await params
  const invoice = await fetchInvoiceDetail(invoiceId)

  return (
    <div className="space-y-4 text-foreground">
      <Panel>
        <PanelHeaderRow
          eyebrow={t("financeDocuments.invoices.detail.eyebrow")}
          title={`${t("financeDocuments.invoices.detail.titlePrefix")} ${invoice.invoice_number}`}
          description={t("financeDocuments.common.snapshotNotice")}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone={statusTone(invoice.status)}>
                {t(`financeDocuments.statuses.invoice.${invoice.status}`)}
              </StatusChip>
              <Button asChild variant="outline" size="sm">
                <Link href={`/invoices/${invoice.id}/public`}>
                  {t("financeDocuments.invoices.detail.publicLink")}
                </Link>
              </Button>
            </div>
          }
        />
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.customer")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {invoice.customer_name_snapshot}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.createdAt")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {formatDateTime(invoice.created_at)}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.address")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {invoice.customer_address_snapshot ?? t("financeDocuments.common.notUpdated")}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.taxCode")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {invoice.customer_tax_code_snapshot ?? t("financeDocuments.common.notUpdated")}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.total")}
            </p>
            <p className="mt-2 text-2xl font-medium tracking-[-0.02em] text-foreground">
              {formatCurrency(invoice.total_amount)}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {invoice.amount_in_words}
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-secondary/35 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t("financeDocuments.common.taxAmount")}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatCurrency(invoice.tax_amount)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t("financeDocuments.common.discountAmount")}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatCurrency(invoice.discount_amount)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/35 p-4 lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.note")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {invoice.note ?? t("financeDocuments.common.noNote")}
            </p>
          </div>

          {invoice.issued_at ? (
            <div className="rounded-lg border border-border bg-secondary/35 p-4 lg:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t("financeDocuments.common.issuedAt")}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {formatDateTime(invoice.issued_at)}
              </p>
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel>
        <PanelHeaderRow
          title={t("financeDocuments.invoices.detail.lineItemsTitle")}
        />
        <TableScrollArea>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/55 hover:bg-secondary/55">
                <TableHead>{t("financeDocuments.common.columns.description")}</TableHead>
                <TableHead>{t("financeDocuments.common.columns.passenger")}</TableHead>
                <TableHead className="text-right">
                  {t("financeDocuments.common.columns.quantity")}
                </TableHead>
                <TableHead className="text-right">
                  {t("financeDocuments.common.columns.unitPrice")}
                </TableHead>
                <TableHead className="text-right">
                  {t("financeDocuments.common.columns.total")}
                </TableHead>
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
        </TableScrollArea>
      </Panel>
    </div>
  )
}
