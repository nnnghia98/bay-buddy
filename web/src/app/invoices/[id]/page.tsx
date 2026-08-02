import {
  Panel,
  PanelHeaderRow,
  StatusChip,
} from "@/components/command-center"
import {
  DocumentField,
  DocumentSummaryGrid,
  FinanceLineItemsTable,
} from "@/components/finance-document-ui"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/formatters"
import { fetchInvoiceDetail } from "@/lib/server-finance"
import { getI18n } from "@/locales/server"
import type { InvoiceDetail } from "@/schemas"
import patterns from "@/styles/ui-patterns.module.css"

type PageProps = {
  params: Promise<{ id: string }>
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
    <div className={patterns.sectionStack}>
      <Panel>
        <PanelHeaderRow
          eyebrow={t("financeDocuments.invoices.detail.eyebrow")}
          title={`${t("financeDocuments.invoices.detail.titlePrefix")} ${invoice.invoice_number}`}
          description={t("financeDocuments.common.snapshotNotice")}
          action={
            <div className={patterns.wrapRow}>
              <StatusChip tone={statusTone(invoice.status)}>
                {t(`financeDocuments.statuses.invoice.${invoice.status}`)}
              </StatusChip>
              <Button
                href={`/invoices/${invoice.id}/public`}
                variant="outline"
                size="sm"
              >
                {t("financeDocuments.invoices.detail.publicLink")}
              </Button>
            </div>
          }
        />
        <DocumentSummaryGrid>
          <DocumentField
            label={t("financeDocuments.common.customer")}
            value={invoice.customer_name_snapshot}
          />
          <DocumentField
            label={t("financeDocuments.common.createdAt")}
            value={formatDateTime(invoice.created_at)}
          />
          <DocumentField
            label={t("financeDocuments.common.address")}
            value={invoice.customer_address_snapshot ?? t("financeDocuments.common.notUpdated")}
          />
          <DocumentField
            label={t("financeDocuments.common.taxCode")}
            value={invoice.customer_tax_code_snapshot ?? t("financeDocuments.common.notUpdated")}
          />
          <DocumentField
            label={t("financeDocuments.common.total")}
            value={
              <>
                <p>{formatCurrency(invoice.total_amount)}</p>
                <p className={patterns.supportingText}>
                  {invoice.amount_in_words}
                </p>
              </>
            }
            valueClassName={patterns.metricValue}
          />
          <DocumentField
            label={t("financeDocuments.common.taxAmount")}
            value={
              <div className={patterns.stack}>
                <p>{formatCurrency(invoice.tax_amount)}</p>
                <div>
                  <p className={patterns.accentEyebrow}>
                    {t("financeDocuments.common.discountAmount")}
                  </p>
                  <p className={patterns.labelText}>
                    {formatCurrency(invoice.discount_amount)}
                  </p>
                </div>
              </div>
            }
          />
          <DocumentField
            className={patterns.spanTwo}
            label={t("financeDocuments.common.note")}
            value={invoice.note ?? t("financeDocuments.common.noNote")}
          />
          {invoice.issued_at ? (
            <DocumentField
              className={patterns.spanTwo}
              label={t("financeDocuments.common.issuedAt")}
              value={formatDateTime(invoice.issued_at)}
            />
          ) : null}
        </DocumentSummaryGrid>
      </Panel>

      <Panel>
        <PanelHeaderRow
          title={t("financeDocuments.invoices.detail.lineItemsTitle")}
        />
        <FinanceLineItemsTable
          items={invoice.items}
          labels={{
            description: t("financeDocuments.common.columns.description"),
            passenger: t("financeDocuments.common.columns.passenger"),
            quantity: t("financeDocuments.common.columns.quantity"),
            total: t("financeDocuments.common.columns.total"),
            unitPrice: t("financeDocuments.common.columns.unitPrice"),
          }}
        />
      </Panel>
    </div>
  )
}
