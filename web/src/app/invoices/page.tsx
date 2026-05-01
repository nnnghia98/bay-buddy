import Link from "next/link"

import {
  CommandPanel,
  CommandPanelHeader,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getI18n } from "@/locales/server"
import { fetchCustomerInvoices } from "@/lib/server-finance"
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

function statusTone(
  status: InvoiceListItem["status"],
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

export default async function InvoicesPage({ searchParams }: PageProps) {
  const t = await getI18n()
  const resolvedSearchParams = (await searchParams) ?? {}
  const customerId = Array.isArray(resolvedSearchParams.customer_id)
    ? resolvedSearchParams.customer_id[0]
    : resolvedSearchParams.customer_id

  if (!customerId) {
    return (
      <div className="space-y-4 text-foreground">
        <CommandPanel>
          <CommandPanelHeader
            eyebrow={t("financeDocuments.invoices.list.eyebrow")}
            title={t("financeDocuments.invoices.list.emptyScopeTitle")}
            description={t("financeDocuments.invoices.list.emptyScopeDescription")}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/customers">
                  {t("financeDocuments.common.backToCustomer")}
                </Link>
              </Button>
            }
          />
        </CommandPanel>
      </div>
    )
  }

  const invoices = await fetchCustomerInvoices(customerId)
  const hasInvoices = invoices.length > 0

  return (
    <div className="space-y-4 text-foreground">
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("financeDocuments.invoices.list.eyebrow")}
          title={t("financeDocuments.invoices.list.title")}
          description={t("financeDocuments.invoices.list.description")}
          action={
            <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {invoices.length} {t("financeDocuments.common.invoice").toLowerCase()}
            </span>
          }
        />
        {!hasInvoices ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground">
              {t("financeDocuments.invoices.list.emptyList")}
            </p>
          </div>
        ) : (
          <TableScrollArea>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/55 hover:bg-secondary/55">
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
                      <StatusChip tone={statusTone(invoice.status)}>
                        {t(`financeDocuments.statuses.invoice.${invoice.status}`)}
                      </StatusChip>
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
          </TableScrollArea>
        )}
      </CommandPanel>
    </div>
  )
}
