import { redirect } from "next/navigation"

import { convertQuoteToInvoiceAction } from "@/actions/quotes"
import { ConvertQuoteSubmitButton } from "@/app/quotes/[id]/convert-quote-submit-button"
import {
  Panel,
  PanelHeaderRow,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
    <div className="space-y-4 text-foreground">
      {convertBannerMessage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm">
          <p className="text-sm font-medium">{convertBannerMessage}</p>
        </div>
      ) : null}

      <Panel>
        <PanelHeaderRow
          eyebrow={t("financeDocuments.quotes.detail.eyebrow")}
          title={`${t("financeDocuments.quotes.detail.titlePrefix")} ${quote.quote_number}`}
          description={t("financeDocuments.quotes.detail.informationalNotice")}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone={statusTone(quote.status)}>
                {quoteStatusLabel}
              </StatusChip>
              <span className="text-xs text-muted-foreground">
                {t("financeDocuments.common.validUntil")}: {formatDate(quote.valid_until)}
              </span>
            </div>
          }
        />
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.customer")}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-foreground">
              {quote.customer_name_snapshot}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("financeDocuments.common.address")}:{" "}
              {quote.customer_address_snapshot ?? t("financeDocuments.common.notUpdated")}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("financeDocuments.common.taxCode")}:{" "}
              {quote.customer_tax_code_snapshot ?? t("financeDocuments.common.notUpdated")}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.total")}
            </p>
            <p className="mt-2 text-2xl font-medium tracking-[-0.02em] text-foreground">
              {formatCurrency(quote.total_amount)}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("financeDocuments.common.taxAmount")}: {formatCurrency(quote.tax_amount)}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              {t("financeDocuments.common.discountAmount")}: {formatCurrency(quote.discount_amount)}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.createdAt")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {formatDate(quote.created_at)}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.amountInWords")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {quote.amount_in_words}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-secondary/35 p-4 lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("financeDocuments.common.note")}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {quote.note ?? t("financeDocuments.common.noNote")}
            </p>
          </div>
        </div>
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
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                {t("financeDocuments.quotes.detail.convertUnavailable")}
              </p>
            )
          }
        />
        <TableScrollArea>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/55 hover:bg-secondary/55">
                <TableHead>{t("financeDocuments.common.columns.description")}</TableHead>
                <TableHead>{t("financeDocuments.common.columns.passenger")}</TableHead>
                <TableHead>{t("financeDocuments.common.columns.quantity")}</TableHead>
                <TableHead>{t("financeDocuments.common.columns.unitPrice")}</TableHead>
                <TableHead className="text-right">
                  {t("financeDocuments.common.columns.total")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[20rem]">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.linked_ticket_id ?? item.passenger_name_snapshot}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{item.passenger_name_snapshot}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unit_price_snapshot)}</TableCell>
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
