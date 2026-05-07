"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, PencilLine, Plus, Search, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"

import {
  CommandPanel,
  CommandPanelHeader,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError, apiFetchData } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { CustomerDirectoryItemSchema, type CustomerDirectoryItem } from "@/schemas"

const customerDirectorySchema = z.array(CustomerDirectoryItemSchema)
const currentUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  role: z.enum(["ADMIN", "STAFF"]),
  is_active: z.boolean(),
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

async function fetchCustomers(): Promise<CustomerDirectoryItem[]> {
  const payload = await apiFetchData<unknown>("/customers/")
  return customerDirectorySchema.parse(payload)
}

async function fetchCurrentUser(): Promise<z.infer<typeof currentUserSchema>> {
  const payload = await apiFetchData<unknown>("/auth/me")
  return currentUserSchema.parse(payload)
}

export default function CustomersPage() {
  const t = useI18n()
  const router = useRouter()
  const { token, isReady, logout } = useAuth()
  const [searchValue, setSearchValue] = React.useState("")
  const deferredSearchValue = React.useDeferredValue(searchValue)

  const customersQuery = useQuery({
    queryKey: ["customers-directory"],
    queryFn: fetchCustomers,
    enabled: isReady && Boolean(token),
  })
  const currentUserQuery = useQuery({
    queryKey: ["customers-current-user-role"],
    queryFn: fetchCurrentUser,
    enabled: isReady && Boolean(token),
  })
  const isAdmin = currentUserQuery.data?.role === "ADMIN"
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isSubmittingCreate, setIsSubmittingCreate] = React.useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false)
  const [isSubmittingDelete, setIsSubmittingDelete] = React.useState(false)
  const [isMutatingCustomerId, setIsMutatingCustomerId] = React.useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerDirectoryItem | null>(null)
  const [editName, setEditName] = React.useState("")
  const [createName, setCreateName] = React.useState("")
  const [createType, setCreateType] = React.useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL")
  const [createPhone, setCreatePhone] = React.useState("")
  const [createEmail, setCreateEmail] = React.useState("")
  const [createAddress, setCreateAddress] = React.useState("")
  const [createTaxCode, setCreateTaxCode] = React.useState("")

  React.useEffect(() => {
    if (isReady && !token) {
      router.replace("/login")
    }
  }, [isReady, router, token])

  React.useEffect(() => {
    if (customersQuery.error instanceof ApiError && customersQuery.error.status === 401) {
      logout()
      router.replace("/login")
    }
  }, [customersQuery.error, logout, router])

  const createCustomer = async () => {
    if (!isAdmin) {
      return
    }

    if (!createName.trim()) {
      toast.error(t("customers.management.validation.nameRequired"))
      return
    }

    setIsSubmittingCreate(true)
    try {
      await apiFetchData("/customers/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createName.trim(),
          type: createType,
          email: createEmail.trim() || null,
          phone: createPhone.trim() || null,
          address: createAddress.trim() || null,
          tax_code: createTaxCode.trim() || null,
          is_active: true,
        }),
      })
      toast.success(t("customers.management.actions.createSuccess"))
      setIsCreateOpen(false)
      setCreateName("")
      setCreateType("INDIVIDUAL")
      setCreatePhone("")
      setCreateEmail("")
      setCreateAddress("")
      setCreateTaxCode("")
      await customersQuery.refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : t("customers.management.actions.failure")
      toast.error(message)
    } finally {
      setIsSubmittingCreate(false)
    }
  }

  const updateCustomerInline = async (customerId: string, payload: { name: string }) => {
    setIsMutatingCustomerId(customerId)
    setIsSubmittingEdit(true)
    try {
      await apiFetchData(`/customers/${customerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      toast.success(t("customers.management.actions.updateSuccess"))
      setIsEditOpen(false)
      setSelectedCustomer(null)
      await customersQuery.refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : t("customers.management.actions.failure")
      toast.error(message)
    } finally {
      setIsSubmittingEdit(false)
      setIsMutatingCustomerId(null)
    }
  }

  const deleteCustomer = async (customerId: string) => {
    setIsMutatingCustomerId(customerId)
    setIsSubmittingDelete(true)
    try {
      await apiFetchData(`/customers/${customerId}`, {
        method: "DELETE",
      })
      toast.success(t("customers.management.actions.deleteSuccess"))
      setIsDeleteOpen(false)
      setSelectedCustomer(null)
      await customersQuery.refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : t("customers.management.actions.failure")
      toast.error(message)
    } finally {
      setIsSubmittingDelete(false)
      setIsMutatingCustomerId(null)
    }
  }

  const normalizedSearch = deferredSearchValue.trim().toLowerCase()

  const filteredCustomers = !normalizedSearch
    ? customersQuery.data ?? []
    : (customersQuery.data ?? []).filter((customer) => {
        const fullName = customer.full_name.toLowerCase()
        const phone = customer.phone?.toLowerCase() ?? ""

        return fullName.includes(normalizedSearch) || phone.includes(normalizedSearch)
      })

  const directoryStats = React.useMemo(() => {
    const customers = customersQuery.data ?? []

    const outstanding = customers.reduce((sum, customer) => {
      return customer.current_balance > 0 ? sum + customer.current_balance : sum
    }, 0)

    const credit = customers.reduce((sum, customer) => {
      return customer.current_balance < 0 ? sum + Math.abs(customer.current_balance) : sum
    }, 0)

    return {
      totalCustomers: customers.length,
      outstanding,
      credit,
    }
  }, [customersQuery.data])

  if (!isReady || !token) {
    return null
  }

  const tableColumnCount = isAdmin ? 5 : 4

  const customerRows = customersQuery.isLoading ? (
      <TableRow>
      <TableCell className="py-12 text-center text-muted-foreground" colSpan={tableColumnCount}>
        {t("customers.directory.loading")}
      </TableCell>
    </TableRow>
  ) : customersQuery.isError ? (
    <TableRow>
      <TableCell className="py-12 text-center text-red-600" colSpan={tableColumnCount}>
        {t("customers.directory.error")}
      </TableCell>
    </TableRow>
  ) : filteredCustomers.length === 0 ? (
    <TableRow>
      <TableCell className="py-12 text-center text-muted-foreground" colSpan={tableColumnCount}>
        {t("customers.directory.empty")}
      </TableCell>
    </TableRow>
  ) : (
    filteredCustomers.map((customer) => (
      <TableRow
        key={customer.id}
        className="cursor-pointer hover:bg-accent/45"
        onClick={() => router.push(`/customers/${customer.id}`)}
        data-state={customer.is_active ? "active" : "inactive"}
      >
        <TableCell className="px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-accent text-sm font-semibold text-primary">
              {getInitials(customer.full_name)}
            </div>
            <div className="space-y-1">
              <div className="font-medium text-foreground">{customer.full_name}</div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("customers.ledger.customerId")}: {customer.id.slice(0, 8)}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="px-6 py-5 text-muted-foreground">
          {customer.phone ? customer.phone : t("financeDocuments.common.notUpdated")}
        </TableCell>
        <TableCell className="px-6 py-5">
          <StatusChip tone={customer.is_active ? "success" : "warning"}>
            {customer.is_active
              ? t("customers.management.statuses.active")
              : t("customers.management.statuses.archived")}
          </StatusChip>
        </TableCell>
        <TableCell
          className={cn(
            "px-6 py-5 text-right font-semibold",
            customer.current_balance > 0
              ? "text-red-600"
              : customer.current_balance < 0
                ? "text-primary"
                : "text-foreground",
          )}
        >
          <div className="inline-flex items-center justify-end gap-2">
            {customer.current_balance < 0 ? (
              <StatusChip tone="info">
                {t("customers.ledger.balanceStates.credit")}
              </StatusChip>
            ) : null}
            <span>{formatCurrency(Math.abs(customer.current_balance))}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </TableCell>
        {isAdmin ? (
          <TableCell className="px-6 py-5">
            <div className="flex items-center justify-end gap-2">
              <Button
                disabled={Boolean(isMutatingCustomerId)}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedCustomer(customer)
                  setEditName(customer.full_name)
                  setIsEditOpen(true)
                }}
                size="icon"
                type="button"
                variant="outline"
              >
                <PencilLine className="h-4 w-4" />
              </Button>
              <Button
                disabled={Boolean(isMutatingCustomerId)}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedCustomer(customer)
                  setIsDeleteOpen(true)
                }}
                size="icon"
                type="button"
                variant="outline"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </TableCell>
        ) : null}
      </TableRow>
    ))
  )

  return (
    <div className="space-y-4 text-foreground">
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("customers.directory.eyebrow")}
          title={t("customers.directory.title")}
          description={t("customers.directory.description")}
          action={
            <div className="flex w-full max-w-3xl items-center justify-end gap-2">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 pl-9"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={t("customers.directory.searchPlaceholder")}
                  value={searchValue}
                />
              </div>
              {isAdmin ? (
                <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
                  <DialogTrigger asChild>
                    <Button type="button">
                      <Plus className="h-4 w-4" />
                      {t("customers.management.createAction")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[min(92vw,42rem)]">
                    <DialogHeader>
                      <DialogTitle>{t("customers.management.dialogs.create.title")}</DialogTitle>
                      <DialogDescription>
                        {t("customers.management.dialogs.create.description")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-customer-name">
                          {t("customers.management.fields.name")}
                        </Label>
                        <Input
                          id="create-customer-name"
                          onChange={(event) => setCreateName(event.target.value)}
                          placeholder={t("customers.management.fields.namePlaceholder")}
                          value={createName}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-customer-type">
                          {t("customers.management.fields.type")}
                        </Label>
                        <select
                          className="flex h-11 w-full rounded-[14px] border border-input bg-white px-3.5 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary"
                          id="create-customer-type"
                          onChange={(event) =>
                            setCreateType(event.target.value as "INDIVIDUAL" | "BUSINESS")
                          }
                          value={createType}
                        >
                          <option value="INDIVIDUAL">
                            {t("customers.management.types.INDIVIDUAL")}
                          </option>
                          <option value="BUSINESS">
                            {t("customers.management.types.BUSINESS")}
                          </option>
                        </select>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="create-customer-phone">
                            {t("customers.management.fields.phone")}
                          </Label>
                          <Input
                            id="create-customer-phone"
                            onChange={(event) => setCreatePhone(event.target.value)}
                            placeholder={t("customers.management.fields.phonePlaceholder")}
                            value={createPhone}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-customer-email">
                            {t("customers.management.fields.email")}
                          </Label>
                          <Input
                            id="create-customer-email"
                            onChange={(event) => setCreateEmail(event.target.value)}
                            placeholder={t("customers.management.fields.emailPlaceholder")}
                            value={createEmail}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-customer-address">
                          {t("customers.management.fields.address")}
                        </Label>
                        <Input
                          id="create-customer-address"
                          onChange={(event) => setCreateAddress(event.target.value)}
                          placeholder={t("customers.management.fields.addressPlaceholder")}
                          value={createAddress}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-customer-tax-code">
                          {t("customers.management.fields.taxCode")}
                        </Label>
                        <Input
                          id="create-customer-tax-code"
                          onChange={(event) => setCreateTaxCode(event.target.value)}
                          placeholder={t("customers.management.fields.taxCodePlaceholder")}
                          value={createTaxCode}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => setIsCreateOpen(false)}
                        type="button"
                        variant="outline"
                      >
                        {t("customers.management.dialogs.cancel")}
                      </Button>
                      <Button
                        disabled={isSubmittingCreate}
                        onClick={() => void createCustomer()}
                        type="button"
                      >
                        {t("customers.management.dialogs.create.submit")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          }
        />
        <div className="grid gap-3 border-b border-border px-4 py-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("customers.directory.metrics.totalCustomers")}
            </p>
            <p className="mt-2 text-2xl font-medium text-foreground">
              {directoryStats.totalCustomers}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("dashboard.summary.widgets.receivables.label")}
            </p>
            <p className="mt-2 text-2xl font-medium text-foreground">
              {formatCurrency(directoryStats.outstanding)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("customers.ledger.balanceStates.credit")}
            </p>
            <p className="mt-2 text-2xl font-medium text-foreground">
              {formatCurrency(directoryStats.credit)}
            </p>
          </div>
        </div>
        <TableScrollArea>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/55 hover:bg-secondary/55">
                <TableHead>{t("financeDocuments.common.customer")}</TableHead>
                <TableHead>{t("customers.directory.columns.phone")}</TableHead>
                <TableHead>{t("customers.management.fields.status")}</TableHead>
                <TableHead className="text-right">
                  {t("customers.ledger.currentBalance")}
                </TableHead>
                {isAdmin ? (
                  <TableHead className="text-right">
                    {t("customers.directory.columns.actions")}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>{customerRows}</TableBody>
          </Table>
        </TableScrollArea>
      </CommandPanel>
      {isAdmin ? (
        <>
          <Dialog onOpenChange={setIsEditOpen} open={isEditOpen}>
            <DialogContent className="w-[min(92vw,32rem)]">
              <DialogHeader>
                <DialogTitle>{t("customers.management.dialogs.edit.title")}</DialogTitle>
                <DialogDescription>
                  {t("customers.management.dialogs.edit.description")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="edit-customer-name">
                  {t("customers.management.fields.name")}
                </Label>
                <Input
                  id="edit-customer-name"
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder={t("customers.management.fields.namePlaceholder")}
                  value={editName}
                />
              </div>
              <DialogFooter>
                <Button onClick={() => setIsEditOpen(false)} type="button" variant="outline">
                  {t("customers.management.dialogs.cancel")}
                </Button>
                <Button
                  disabled={isSubmittingEdit || !selectedCustomer || !editName.trim()}
                  onClick={() => {
                    if (!selectedCustomer || !editName.trim()) {
                      return
                    }
                    void updateCustomerInline(selectedCustomer.id, { name: editName.trim() })
                  }}
                  type="button"
                >
                  {t("customers.management.dialogs.edit.submit")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
            <DialogContent className="w-[min(92vw,32rem)]">
              <DialogHeader>
                <DialogTitle>{t("customers.management.deleteAction")}</DialogTitle>
                <DialogDescription>
                  {t("customers.management.dialogs.delete.confirm")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setIsDeleteOpen(false)} type="button" variant="outline">
                  {t("customers.management.dialogs.cancel")}
                </Button>
                <Button
                  disabled={isSubmittingDelete || !selectedCustomer}
                  onClick={() => {
                    if (!selectedCustomer) {
                      return
                    }
                    void deleteCustomer(selectedCustomer.id)
                  }}
                  type="button"
                >
                  {t("customers.management.deleteAction")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  )
}
