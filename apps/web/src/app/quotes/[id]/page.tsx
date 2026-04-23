import { redirect } from "next/navigation"

import { convertQuoteToInvoiceAction } from "@/actions/quotes"
import { ConvertQuoteSubmitButton } from "@/app/quotes/[id]/convert-quote-submit-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchQuoteDetail } from "@/lib/server-finance"
import { getI18n } from "@/locales/server"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    convert_status?: string
    convert_message?: string
  }>
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
  }).format(date)
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
    <div className="mx-auto max-w-6xl space-y-6 text-foreground">
      <section className="rounded-[28px] border border-border bg-white p-6 shadow-[var(--shadow-lg),var(--theme-shadow-soft)] lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {t("financeDocuments.quotes.detail.eyebrow")}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-medium tracking-[-0.03em] text-foreground">
                {t("financeDocuments.quotes.detail.titlePrefix")} {quote.quote_number}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                {t("financeDocuments.quotes.detail.informationalNotice")}
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-secondary p-5 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("financeDocuments.common.status")}
            </p>
            <p className="mt-3 text-2xl font-medium tracking-[-0.02em] text-foreground">
              {quoteStatusLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("financeDocuments.common.validUntil")}: {formatDate(quote.valid_until)}
            </p>
          </div>
        </div>
      </section>

      {convertBannerMessage ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-medium">{convertBannerMessage}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>{t("financeDocuments.common.customer")}</CardDescription>
            <CardTitle className="text-xl">{quote.customer_name_snapshot}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {t("financeDocuments.common.address")}:{" "}
              {quote.customer_address_snapshot ?? t("financeDocuments.common.notUpdated")}
            </p>
            <p>
              {t("financeDocuments.common.taxCode")}:{" "}
              {quote.customer_tax_code_snapshot ?? t("financeDocuments.common.notUpdated")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{t("financeDocuments.common.total")}</CardDescription>
            <CardTitle className="text-xl">{formatCurrency(quote.total_amount)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {t("financeDocuments.common.taxAmount")}: {formatCurrency(quote.tax_amount)}
            </p>
            <p>
              {t("financeDocuments.common.discountAmount")}:{" "}
              {formatCurrency(quote.discount_amount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{t("financeDocuments.common.createdAt")}</CardDescription>
            <CardTitle className="text-xl">{formatDate(quote.created_at)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{t("financeDocuments.common.amountInWords")}</CardDescription>
            <CardTitle className="text-xl leading-8">{quote.amount_in_words}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-border bg-white shadow-[var(--shadow-lg),var(--theme-shadow-soft)]">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-foreground">
              {t("financeDocuments.quotes.detail.lineItemsTitle")}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("financeDocuments.common.snapshotNotice")}
            </p>
          </div>
          {quote.status === "DRAFT" ? (
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
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/80 hover:bg-secondary/80">
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
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Card>
          <CardHeader>
            <CardDescription>{t("financeDocuments.common.note")}</CardDescription>
            <CardTitle className="text-xl">
              {quote.note ?? t("financeDocuments.common.noNote")}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{t("financeDocuments.common.validUntil")}</CardDescription>
            <CardTitle className="text-xl">{formatDate(quote.valid_until)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            <p>{t("financeDocuments.quotes.detail.informationalNotice")}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
