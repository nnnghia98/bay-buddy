import { ConfiguredValue } from "@/components/configured-field"
import patterns from "@/styles/ui-patterns.module.css"
import { Banner } from "@astryxdesign/core/Banner"
import { redirect } from "next/navigation"

import { convertQuoteToInvoiceAction } from "@/actions/quotes"
import { ConvertQuoteSubmitButton } from "@/app/quotes/[id]/convert-quote-submit-button"
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
import { formatCurrency } from "@/lib/formatters"
import { fetchQuoteDetail } from "@/lib/server-finance"
import { getI18n } from "@/locales/server"
import type { QuoteDetail } from "@/schemas"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    convert_status?: string
    convert_message?: string
  }>
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
  }).format(date)
}

function statusTone(
  status: QuoteDetail["status"],
): "warning" | "success" | "neutral" | "danger" {
  switch (status) {
    case "DRAFT":
      return "warning"
    case "ACCEPTED":
      return "success"
    case "EXPIRED":
      return "neutral"
    case "CANCELLED":
      return "danger"
    default:
      return "neutral"
  }
}

export default async function QuoteDetailPage({ params, searchParams }: PageProps) {
  const { id: quoteId } = await params
  const scopedSearchParams = (await searchParams) ?? {}
  const [t, quote] = await Promise.all([
    getI18n(),
    fetchQuoteDetail(quoteId),
  ])

  const convertStatus = scopedSearchParams.convert_status
  const convertMessage = scopedSearchParams.convert_message
  const convertFailureMessage = t("financeDocuments.actions.quoteConvert.failure")

  async function convertAction(formData: FormData) {
    "use server"

    const result = await convertQuoteToInvoiceAction(undefined, formData)

    if (result.status === "success" && result.invoiceId) {
      redirect(`/invoices/${result.invoiceId}`)
    }

    const nextParams = new URLSearchParams()
    nextParams.set("convert_status", "error")
    nextParams.set("convert_message", result.message ?? convertFailureMessage)

    redirect(`/quotes/${quoteId}?${nextParams.toString()}`)
  }

  const quoteStatusLabel = t(`financeDocuments.statuses.quote.${quote.status}`)
  const convertBannerMessage =
    convertStatus === "error" ? convertMessage ?? convertFailureMessage : null

  return (
    <div className={patterns.sectionStack}>
      {convertBannerMessage ? (
        <Banner status="warning" title={convertBannerMessage} />
      ) : null}

      <Panel>
        <PanelHeaderRow
          eyebrow={t("financeDocuments.quotes.detail.eyebrow")}
          title={`${t("financeDocuments.quotes.detail.titlePrefix")} ${quote.quote_number}`}
          description={t("financeDocuments.quotes.detail.informationalNotice")}
          action={
            <div className={patterns.wrapRow}>
              <ConfiguredValue field="quote.status"><StatusChip tone={statusTone(quote.status)}>
                {quoteStatusLabel}
              </StatusChip></ConfiguredValue>
              <ConfiguredValue field="quote.valid_until"><span className={patterns.supportingText}>
                {t("financeDocuments.common.validUntil")}: {formatDate(quote.valid_until)}
              </span></ConfiguredValue>
            </div>
          }
        />
        <DocumentSummaryGrid>
          <DocumentField field="quote.customer_name_snapshot"
            label={t("financeDocuments.common.customer")}
            value={
              <>
                <ConfiguredValue field="quote.customer_name_snapshot"><p>{quote.customer_name_snapshot}</p></ConfiguredValue>
                <ConfiguredValue field="quote.customer_address_snapshot"><p className={patterns.supportingText}>
                  {t("financeDocuments.common.address")}:{" "}
                  {quote.customer_address_snapshot ?? t("financeDocuments.common.notUpdated")}
                </p></ConfiguredValue>
                <ConfiguredValue field="quote.customer_tax_code_snapshot"><p className={patterns.supportingText}>
                  {t("financeDocuments.common.taxCode")}:{" "}
                  {quote.customer_tax_code_snapshot ?? t("financeDocuments.common.notUpdated")}
                </p></ConfiguredValue>
              </>
            }
          />
          <DocumentField field="quote.total_amount"
            label={t("financeDocuments.common.total")}
            value={
              <>
                <ConfiguredValue field="quote.total_amount"><p>{formatCurrency(quote.total_amount)}</p></ConfiguredValue>
                <ConfiguredValue field="quote.tax_amount"><p className={patterns.supportingText}>
                  {t("financeDocuments.common.taxAmount")}: {formatCurrency(quote.tax_amount)}
                </p></ConfiguredValue>
                <ConfiguredValue field="quote.discount_amount"><p className={patterns.supportingText}>
                  {t("financeDocuments.common.discountAmount")}: {formatCurrency(quote.discount_amount)}
                </p></ConfiguredValue>
              </>
            }
            valueClassName={patterns.metricValue}
          />
          <DocumentField field="quote.created_at"
            label={t("financeDocuments.common.createdAt")}
            value={formatDate(quote.created_at)}
          />
          <DocumentField
            label={t("financeDocuments.common.amountInWords")}
            value={quote.amount_in_words}
          />
          <DocumentField field="quote.note"
            className={patterns.spanTwo}
            label={t("financeDocuments.common.note")}
            value={quote.note ?? t("financeDocuments.common.noNote")}
          />
        </DocumentSummaryGrid>
      </Panel>

      <Panel>
        <PanelHeaderRow
          title={t("financeDocuments.quotes.detail.lineItemsTitle")}
          description={t("financeDocuments.common.snapshotNotice")}
          action={
            quote.status === "DRAFT" ? (
              <form action={convertAction}>
                <input name="quote_id" type="hidden" value={quote.id} />
                <ConvertQuoteSubmitButton
                  label={t("financeDocuments.quotes.detail.convert")}
                  pendingLabel={t("financeDocuments.quotes.detail.converting")}
                />
              </form>
            ) : (
              <p className={patterns.mutedText}>
                {t("financeDocuments.quotes.detail.convertUnavailable")}
              </p>
            )
          }
        />
        <FinanceLineItemsTable fieldTable="quote_item"
          items={quote.items}
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
