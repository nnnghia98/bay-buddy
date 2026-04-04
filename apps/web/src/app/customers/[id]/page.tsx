"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { Loader2, ReceiptText, Wallet } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiFetchData, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import {
  CustomerLedgerSchema,
  RecordPaymentSchema,
  type CustomerLedger,
  type RecordPayment,
} from "@/schemas"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

async function fetchCustomerLedger(customerId: string): Promise<CustomerLedger> {
  const payload = await apiFetchData<unknown>(`/customers/${customerId}/ledger`)
  return CustomerLedgerSchema.parse(payload)
}

async function submitPayment(
  customerId: string,
  values: RecordPayment,
): Promise<void> {
  await apiFetchData(`/customers/${customerId}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  })
}

export default function CustomerLedgerPage() {
  const params = useParams<{ id: string }>()
  const customerId = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const queryClient = useQueryClient()
  const { token, isReady, logout } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const paymentForm = useForm<RecordPayment>({
    resolver: zodResolver(RecordPaymentSchema),
    defaultValues: {
      amount: 0,
      note: "",
    },
  })

  React.useEffect(() => {
    if (isReady && !token) {
      router.replace("/login")
    }
  }, [isReady, router, token])

  const ledgerQuery = useQuery({
    queryKey: ["customer-ledger", customerId],
    queryFn: () => fetchCustomerLedger(customerId),
    enabled: isReady && Boolean(token) && Boolean(customerId),
  })

  const paymentMutation = useMutation({
    mutationFn: (values: RecordPayment) => submitPayment(customerId, values),
    onSuccess: async () => {
      toast.success("Payment recorded successfully")
      setIsDialogOpen(false)
      paymentForm.reset({ amount: 0, note: "" })
      await queryClient.invalidateQueries({
        queryKey: ["customer-ledger", customerId],
      })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        logout()
        router.replace("/login")
      }

      toast.error(error instanceof Error ? error.message : "Unable to record payment")
    },
  })

  if (!isReady || !token) {
    return null
  }

  if (ledgerQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f5f1e8_0%,#efe6d4_100%)]">
        <div className="flex items-center gap-3 rounded-full border border-stone-300 bg-white/90 px-5 py-3 text-sm font-medium text-stone-700 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading customer ledger
        </div>
      </div>
    )
  }

  if (ledgerQuery.isError || !ledgerQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f5f1e8_0%,#efe6d4_100%)] px-4">
        <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-stone-900">Ledger unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            We could not load this customer ledger right now. Please confirm the
            customer ID and try again.
          </p>
        </div>
      </div>
    )
  }

  const ledger = ledgerQuery.data

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.18),_transparent_30%),linear-gradient(180deg,_#f8f5ef_0%,_#efe4d2_100%)] px-4 py-8 text-stone-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-amber-950/10 backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
                Customer Ledger
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {ledger.customer.name}
              </h1>
              <p className="text-sm text-stone-600">
                Balance tracking for {ledger.customer.type.toLowerCase()} account
              </p>
            </div>

            <Button className="h-11 px-5" onClick={() => setIsDialogOpen(true)}>
              Record Payment
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5">
              <div className="flex items-center gap-3 text-amber-900">
                <ReceiptText className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-[0.2em]">
                  Total Debt
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold">
                {formatCurrency(ledger.total_debt)}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5">
              <div className="flex items-center gap-3 text-emerald-900">
                <Wallet className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-[0.2em]">
                  Total Paid
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold">
                {formatCurrency(ledger.total_paid)}
              </p>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-100/80 p-5">
              <span className="text-sm font-medium uppercase tracking-[0.2em] text-stone-600">
                Current Balance
              </span>
              <p className="mt-4 text-3xl font-semibold">
                {formatCurrency(ledger.current_balance)}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-2xl shadow-amber-950/10 backdrop-blur">
          <div className="border-b border-stone-200 px-6 py-5">
            <h2 className="text-xl font-semibold tracking-tight">Ledger Timeline</h2>
            <p className="mt-1 text-sm text-stone-600">
              Tickets and balance-affecting transactions are shown in chronological order.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50/90 text-left text-xs uppercase tracking-[0.18em] text-stone-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                  <th className="px-6 py-4 font-medium text-right">Balance Delta</th>
                  <th className="px-6 py-4 font-medium text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ledger.entries.map((entry) => (
                  <tr key={`${entry.entry_type}-${entry.id}`} className="align-top">
                    <td className="whitespace-nowrap px-6 py-4 text-stone-600">
                      {formatDate(entry.occurred_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-stone-600">
                        {entry.entry_type === "ticket"
                          ? "Ticket"
                          : entry.transaction_type ?? "Transaction"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-stone-900">{entry.title}</div>
                      <div className="mt-1 text-stone-600">
                        {entry.pnr ? `${entry.pnr} · ` : ""}
                        {entry.itinerary ?? entry.method ?? "Manual ledger entry"}
                      </div>
                      {entry.note ? (
                        <div className="mt-1 max-w-xl text-xs leading-5 text-stone-500">
                          {entry.note}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-stone-900">
                      {formatCurrency(entry.display_amount)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-4 text-right font-medium ${
                        entry.balance_delta > 0
                          ? "text-amber-700"
                          : entry.balance_delta < 0
                            ? "text-emerald-700"
                            : "text-stone-400"
                      }`}
                    >
                      {entry.balance_delta === 0
                        ? "-"
                        : formatCurrency(entry.balance_delta)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-stone-700">
                      {formatCurrency(entry.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/60 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Record Payment</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Add a payment entry to reduce this customer&apos;s outstanding balance.
                </p>
              </div>
              <button
                className="rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-600 transition hover:bg-stone-100"
                onClick={() => setIsDialogOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <form
              className="mt-6 space-y-5"
              onSubmit={paymentForm.handleSubmit((values) =>
                paymentMutation.mutate(values),
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  inputMode="numeric"
                  type="number"
                  {...paymentForm.register("amount", { valueAsNumber: true })}
                />
                {paymentForm.formState.errors.amount ? (
                  <p className="text-sm text-red-600">
                    {paymentForm.formState.errors.amount.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  rows={4}
                  placeholder="Bank transfer reference or payment note"
                  {...paymentForm.register("note")}
                />
                {paymentForm.formState.errors.note ? (
                  <p className="text-sm text-red-600">
                    {paymentForm.formState.errors.note.message}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  className="bg-stone-200 text-stone-900 hover:bg-stone-300"
                  onClick={() => setIsDialogOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button disabled={paymentMutation.isPending} type="submit">
                  {paymentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    "Record Payment"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
