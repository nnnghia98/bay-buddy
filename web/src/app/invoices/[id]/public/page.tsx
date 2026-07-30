import patterns from "@/styles/ui-patterns.module.css"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusChip } from "@/components/command-center"
import { FinanceLineItemsTable } from "@/components/finance-document-ui"
import { formatCurrency } from "@/lib/formatters"
import { fetchInvoicePublicView } from "@/lib/server-finance"
import { getI18n } from "@/locales/server"
import type { InvoicePublicView } from "@/schemas"
import styles from "./invoice-public.module.css"

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

function getStatusTone(
  status: InvoicePublicView["invoice"]["status"],
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

export default async function InvoicePublicPage({ params }: PageProps) {
  const t = await getI18n()
  const { id: invoiceId } = await params
  const publicView = await fetchInvoicePublicView(invoiceId)

  return (
    <div className={styles.page}>
      <Card className={styles.document}>
        <CardHeader className={styles.brandHeader}>
          <div className={patterns.sectionStack}>
            <div className={styles.eyebrow}>
              {t("financeDocuments.invoices.public.eyebrow")}
            </div>
            <div className={styles.brandRow}>
              <div className={patterns.fieldStack}>
                <CardTitle className={styles.brandTitle}>
                  {publicView.brand.company_name}
                </CardTitle>
                <CardDescription className={styles.brandDescription}>
                  {publicView.brand.slogan}
                </CardDescription>
              </div>
              <div className={styles.contact}>
                <p>{t("financeDocuments.invoices.public.contact")}</p>
                <p>{publicView.brand.support_email}</p>
                <p>{publicView.brand.hotline}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className={styles.content}>
          <div className={styles.identityGrid}>
            <div className={patterns.sectionStack}>
              <h1 className={styles.invoiceTitle}>
                {t("financeDocuments.common.invoice")} {publicView.invoice.invoice_number}
              </h1>
              <div className={styles.metadata}>
                <StatusChip tone={getStatusTone(publicView.invoice.status)}>
                  {t(`financeDocuments.statuses.invoice.${publicView.invoice.status}`)}
                </StatusChip>
                <span className={styles.datePill}>
                  {t("financeDocuments.common.createdAt")}:{" "}
                  {formatDateTime(publicView.invoice.created_at)}
                </span>
              </div>
            </div>

            <div className={styles.customerSummary}>
              <div>
                <p className={patterns.eyebrow}>
                  {t("financeDocuments.common.customer")}
                </p>
                <p className={styles.fieldValue}>
                  {publicView.invoice.customer_name_snapshot}
                </p>
              </div>
              <div>
                <p className={patterns.eyebrow}>
                  {t("financeDocuments.common.address")}
                </p>
                <p className={styles.fieldValue}>
                  {publicView.invoice.customer_address_snapshot ??
                    t("financeDocuments.common.notUpdated")}
                </p>
              </div>
              <div>
                <p className={patterns.eyebrow}>
                  {t("financeDocuments.common.taxCode")}
                </p>
                <p className={styles.fieldValue}>
                  {publicView.invoice.customer_tax_code_snapshot ??
                    t("financeDocuments.common.notUpdated")}
                </p>
              </div>
            </div>
          </div>

          <section className={styles.lineItems}>
            <div className={styles.lineItemsHeader}>
              <h2 className={patterns.accentEyebrow}>
                {t("financeDocuments.invoices.public.lineItemsTitle")}
              </h2>
            </div>
            <FinanceLineItemsTable
              items={publicView.items}
              labels={{
                description: t("financeDocuments.common.columns.description"),
                passenger: t("financeDocuments.common.columns.passenger"),
                quantity: t("financeDocuments.common.columns.quantity"),
                total: t("financeDocuments.common.columns.total"),
                unitPrice: t("financeDocuments.common.columns.unitPrice"),
              }}
              showLinkedTicketId={false}
            />
          </section>

          <section className={styles.totalsGrid}>
            <div className={styles.amountWords}>
              <p className={patterns.eyebrow}>
                {t("financeDocuments.common.amountInWords")}
              </p>
              <p className={styles.amountWordsValue}>
                {publicView.amount_in_words}
              </p>
            </div>

            <div className={styles.totals}>
              <div>
                <p className={patterns.eyebrow}>
                  {t("financeDocuments.common.taxAmount")}
                </p>
                <p className={styles.totalValue}>
                  {formatCurrency(publicView.invoice.tax_amount)}
                </p>
              </div>
              <div>
                <p className={patterns.eyebrow}>
                  {t("financeDocuments.common.discountAmount")}
                </p>
                <p className={styles.totalValue}>
                  {formatCurrency(publicView.invoice.discount_amount)}
                </p>
              </div>
              <div>
                <p className={patterns.eyebrow}>
                  {t("financeDocuments.common.total")}
                </p>
                <p className={styles.totalValue}>
                  {formatCurrency(publicView.invoice.total_amount)}
                </p>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
