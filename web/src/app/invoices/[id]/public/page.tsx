import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FinanceLineItemsTable } from "@/components/finance-document-ui"
import { formatCurrency } from "@/lib/formatters"
import { fetchInvoicePublicView } from "@/lib/server-finance"
import { getI18n } from "@/locales/server"
import type { InvoicePublicView } from "@/schemas"

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

function getStatusClass(status: InvoicePublicView["invoice"]["status"]): string {
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

export default async function InvoicePublicPage({ params }: PageProps) {
  const t = await getI18n()
  const { id: invoiceId } = await params
  const publicView = await fetchInvoicePublicView(invoiceId)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-foreground">
      <Card className="overflow-hidden border border-border bg-white shadow-[var(--shadow-lg),var(--theme-shadow-soft)]">
        <CardHeader className="border-b border-border bg-secondary/30">
          <div className="space-y-4">
            <div className="inline-flex w-fit items-center rounded-full border border-primary/15 bg-accent/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("financeDocuments.invoices.public.eyebrow")}
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl font-semibold tracking-[-0.02em]">
                  {publicView.brand.company_name}
                </CardTitle>
                <CardDescription className="max-w-2xl text-base leading-7">
                  {publicView.brand.slogan}
                </CardDescription>
              </div>
              <div className="rounded-lg border border-border bg-white px-4 py-3 text-sm leading-6 text-muted-foreground">
                <p>{t("financeDocuments.invoices.public.contact")}</p>
                <p>{publicView.brand.support_email}</p>
                <p>{publicView.brand.hotline}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 lg:p-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
                {t("financeDocuments.common.invoice")} {publicView.invoice.invoice_number}
              </h1>
              <div className="flex flex-wrap gap-3">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusClass(publicView.invoice.status)}`}
                >
                  {t(`financeDocuments.statuses.invoice.${publicView.invoice.status}`)}
                </span>
                <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.createdAt")}:{" "}
                  {formatDateTime(publicView.invoice.created_at)}
                </span>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-border bg-secondary/30 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.customer")}
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {publicView.invoice.customer_name_snapshot}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.address")}
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {publicView.invoice.customer_address_snapshot ??
                    t("financeDocuments.common.notUpdated")}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.taxCode")}
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {publicView.invoice.customer_tax_code_snapshot ??
                    t("financeDocuments.common.notUpdated")}
                </p>
              </div>
            </div>
          </div>

          <section className="overflow-hidden rounded-xl border border-border bg-white">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
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

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-lg border border-border bg-secondary/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("financeDocuments.common.amountInWords")}
              </p>
              <p className="mt-3 text-base leading-7 text-foreground">
                {publicView.amount_in_words}
              </p>
            </div>

            <div className="grid gap-3 rounded-lg border border-border bg-secondary/30 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.taxAmount")}
                </p>
                <p className="mt-1 text-lg font-medium text-foreground">
                  {formatCurrency(publicView.invoice.tax_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.discountAmount")}
                </p>
                <p className="mt-1 text-lg font-medium text-foreground">
                  {formatCurrency(publicView.invoice.discount_amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("financeDocuments.common.total")}
                </p>
                <p className="mt-1 text-lg font-medium text-foreground">
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
