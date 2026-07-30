import patterns from "@/styles/ui-patterns.module.css"
import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"

import { EmptyState, Panel, StatusChip, TableScrollArea } from "@/components/command-center"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/formatters"
import { fetchCustomerInvoices } from "@/lib/server-finance"
import { getI18n } from "@/locales/server"
import type { InvoiceListItem } from "@/schemas"
import styles from "./invoices.module.css"

type PageProps = {
  searchParams?: Promise<{ customer_id?: string | string[] }>
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
      <div className={patterns.page}>
        <Panel>
          <div className={styles.scopeEmpty}>
            <div className={styles.scopeIcon}>
              <FileText className={patterns.iconMedium} aria-hidden="true" />
            </div>
            <div className={patterns.compactStack}>
              <h1 className={patterns.sectionTitle}>
                {t("financeDocuments.invoices.list.emptyScopeTitle")}
              </h1>
              <p className={styles.scopeDescription}>
                {t("financeDocuments.invoices.list.emptyScopeDescription")}
              </p>
            </div>
            <Button as={Link} href="/customers" variant="outline" size="sm">
              <ArrowLeft className={patterns.iconSmall} />
              {t("financeDocuments.common.backToCustomer")}
            </Button>
          </div>
        </Panel>
      </div>
    )
  }

  const invoices = await fetchCustomerInvoices(customerId)

  return (
    <div className={patterns.page}>
      <Panel>
        <div className={styles.header}>
          <p className={patterns.accentEyebrow}>
            {t("financeDocuments.invoices.list.title")}
          </p>
          <span className={patterns.supportingText}>
            {invoices.length} {t("financeDocuments.common.invoice").toLowerCase()}
          </span>
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            message={t("financeDocuments.invoices.list.emptyList")}
          />
        ) : (
          <TableScrollArea>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("financeDocuments.common.invoice")}</TableHead>
                  <TableHead>{t("financeDocuments.common.status")}</TableHead>
                  <TableHead>{t("financeDocuments.common.customer")}</TableHead>
                  <TableHead className={styles.numberCell}>{t("financeDocuments.common.total")}</TableHead>
                  <TableHead>{t("financeDocuments.common.createdAt")}</TableHead>
                  <TableHead className={styles.actionsCell}>{t("financeDocuments.common.print")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className={styles.invoiceNumber}>
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={statusTone(invoice.status)}>
                        {t(`financeDocuments.statuses.invoice.${invoice.status}`)}
                      </StatusChip>
                    </TableCell>
                    <TableCell className={styles.mutedCell}>
                      {invoice.customer_name_snapshot}
                    </TableCell>
                    <TableCell className={styles.numberCell}>
                      {formatCurrency(invoice.total_amount)}
                    </TableCell>
                    <TableCell className={styles.mutedCell}>
                      {formatDate(invoice.created_at)}
                    </TableCell>
                    <TableCell className={styles.actionsCell}>
                      <div className={patterns.endRow}>
                        <Button
                          as={Link}
                          href={`/invoices/${invoice.id}`}
                          variant="ghost"
                          size="sm"
                        >
                          {t("financeDocuments.common.viewDetail")}
                        </Button>
                        <Button
                          as={Link}
                          href={`/invoices/${invoice.id}/public`}
                          size="sm"
                        >
                          {t("financeDocuments.common.openPrint")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScrollArea>
        )}
      </Panel>
    </div>
  )
}
