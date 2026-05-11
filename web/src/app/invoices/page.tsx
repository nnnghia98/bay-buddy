import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"

import { StatusChip, TableScrollArea } from "@/components/command-center"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getI18n } from "@/locales/server"
import { fetchCustomerInvoices } from "@/lib/server-finance"
import type { InvoiceListItem } from "@/schemas"

type PageProps = {
  searchParams?: Promise<{ customer_id?: string | string[] }>
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount)
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value)
}

function statusTone(status: InvoiceListItem["status"]): "info" | "success" | "danger" | "warning" {
  switch (status) {
    case "ISSUED": return "info"
    case "PAID": return "success"
    case "CANCELLED": return "danger"
    default: return "warning"
  }
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const t = await getI18n()
  const resolvedSearchParams = (await searchParams) ?? {}
  const customerId = Array.isArray(resolvedSearchParams.customer_id)
    ? resolvedSearchParams.customer_id[0]
    : resolvedSearchParams.customer_id

  if (!customerId) {
    return (
      <div className="pb-12 text-foreground">
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary text-primary">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-semibold text-foreground">
                {t("financeDocuments.invoices.list.emptyScopeTitle")}
              </h1>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("financeDocuments.invoices.list.emptyScopeDescription")}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/customers">
                <ArrowLeft className="h-4 w-4" />
                {t("financeDocuments.common.backToCustomer")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const invoices = await fetchCustomerInvoices(customerId)

  return (
    <div className="pb-12 text-foreground">
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {t("financeDocuments.invoices.list.title")}
          </p>
          <span className="text-xs text-muted-foreground">
            {invoices.length} {t("financeDocuments.common.invoice").toLowerCase()}
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">{t("financeDocuments.invoices.list.emptyList")}</p>
          </div>
        ) : (
          <TableScrollArea>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className="px-5">{t("financeDocuments.common.invoice")}</TableHead>
                  <TableHead className="px-5">{t("financeDocuments.common.status")}</TableHead>
                  <TableHead className="px-5">{t("financeDocuments.common.customer")}</TableHead>
                  <TableHead className="px-5 text-right">{t("financeDocuments.common.total")}</TableHead>
                  <TableHead className="px-5">{t("financeDocuments.common.createdAt")}</TableHead>
                  <TableHead className="px-5 text-right">{t("financeDocuments.common.print")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-accent/45">
                    <TableCell className="px-5 py-3.5 font-mono text-sm font-medium text-foreground">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <StatusChip tone={statusTone(invoice.status)}>
                        {t(`financeDocuments.statuses.invoice.${invoice.status}`)}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-sm text-muted-foreground">
                      {invoice.customer_name_snapshot}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(invoice.total_amount)}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-sm text-muted-foreground">
                      {formatDate(invoice.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                          <Link href={`/invoices/${invoice.id}`}>{t("financeDocuments.common.viewDetail")}</Link>
                        </Button>
                        <Button asChild size="sm" className="h-8 text-xs">
                          <Link href={`/invoices/${invoice.id}/public`}>{t("financeDocuments.common.openPrint")}</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScrollArea>
        )}
      </div>
    </div>
  )
}
