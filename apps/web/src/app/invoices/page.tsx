import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getI18n } from "@/locales/server"
import { fetchCustomerInvoices } from "@/lib/server-finance"
import { cn } from "@/lib/utils"
import type { InvoiceListItem } from "@/schemas"

type PageProps = {
  searchParams?: Promise<{
    customer_id?: string | string[]
  }>
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value)
}

function getStatusClass(status: InvoiceListItem["status"]): string {
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

export default async function InvoicesPage({ searchParams }: PageProps) {
  const t = await getI18n()
  const resolvedSearchParams = (await searchParams) ?? {}
  const customerId = Array.isArray(resolvedSearchParams.customer_id)
    ? resolvedSearchParams.customer_id[0]
    : resolvedSearchParams.customer_id

  if (!customerId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center px-4 py-10">
        <Card className="w-full border border-border bg-white">
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-accent/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("financeDocuments.invoices.list.eyebrow")}
            </div>
            <CardTitle className="text-3xl tracking-[-0.03em]">
              {t("financeDocuments.invoices.list.emptyScopeTitle")}
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              {t("financeDocuments.invoices.list.emptyScopeDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/customers">
                {t("financeDocuments.common.backToCustomer")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const invoices = await fetchCustomerInvoices(customerId)
  const hasInvoices = invoices.length > 0

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 text-foreground">
      <section className="rounded-[28px] border border-border bg-white p-6 shadow-[var(--shadow-lg),var(--theme-shadow-soft)] lg:p-8">
        <div className="space-y-3">
          <div className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-accent/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t("financeDocuments.invoices.list.eyebrow")}
          </div>
          <h1 className="text-4xl font-medium tracking-[-0.03em] text-foreground">
            {t("financeDocuments.invoices.list.title")}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">
            {t("financeDocuments.invoices.list.description")}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-border bg-white shadow-[var(--shadow-lg),var(--theme-shadow-soft)]">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-foreground">
              {t("financeDocuments.common.invoice")}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {customerId}
            </p>
          </div>
          <div className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {invoices.length} {t("financeDocuments.common.invoice").toLowerCase()}
          </div>
        </div>

        {!hasInvoices ? (
          <div className="px-6 py-14 text-center">
            <p className="text-lg font-medium text-foreground">
              {t("financeDocuments.invoices.list.emptyList")}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                <TableHead>{t("financeDocuments.common.invoice")}</TableHead>
                <TableHead>{t("financeDocuments.common.status")}</TableHead>
                <TableHead>{t("financeDocuments.common.customer")}</TableHead>
                <TableHead className="text-right">
                  {t("financeDocuments.common.total")}
                </TableHead>
                <TableHead>{t("financeDocuments.common.createdAt")}</TableHead>
                <TableHead className="text-right">
                  {t("financeDocuments.common.print")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium text-foreground">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                        getStatusClass(invoice.status),
                      )}
                    >
                      {t(`financeDocuments.statuses.invoice.${invoice.status}`)}
                    </span>
                  </TableCell>
                  <TableCell>{invoice.customer_name_snapshot}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.total_amount)}
                  </TableCell>
                  <TableCell>{formatDate(invoice.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/invoices/${invoice.id}`}>
                          {t("financeDocuments.common.viewDetail")}
                        </Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/invoices/${invoice.id}/public`}>
                          {t("financeDocuments.common.openPrint")}
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
