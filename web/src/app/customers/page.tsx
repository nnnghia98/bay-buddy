"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Landmark, Loader2, PencilLine, Plus, Search, Trash2, Users, WalletCards } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"

import { MetricCard, Panel, StatusChip, TableScrollArea } from "@/components/command-center"
import {
  InitialsAvatar,
  TableStateRow,
  selectInputClassName,
} from "@/components/operations-ui"
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
import { LOGIN_PATH, SESSION_EXPIRED_LOGIN_PATH } from "@/lib/auth-token"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { CustomerDirectoryItemSchema, type CustomerDirectoryItem } from "@/schemas"
import styles from "./customers.module.css"

const customerDirectorySchema = z.array(CustomerDirectoryItemSchema)
const currentUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  role: z.enum(["ADMIN", "STAFF"]),
  is_active: z.boolean(),
})

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
      router.replace(LOGIN_PATH)
    }
  }, [isReady, router, token])

  React.useEffect(() => {
    if (
      (customersQuery.error instanceof ApiError &&
        customersQuery.error.status === 401) ||
      (currentUserQuery.error instanceof ApiError &&
        currentUserQuery.error.status === 401)
    ) {
      logout()
      router.replace(SESSION_EXPIRED_LOGIN_PATH)
    }
  }, [currentUserQuery.error, customersQuery.error, logout, router])

  const createCustomer = async () => {
    if (!isAdmin) return
    if (!createName.trim()) {
      toast.error(t("customers.management.validation.nameRequired"))
      return
    }
    setIsSubmittingCreate(true)
    try {
      await apiFetchData("/customers/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
      await apiFetchData(`/customers/${customerId}`, { method: "DELETE" })
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
    const outstanding = customers.reduce(
      (sum, c) => (c.current_balance > 0 ? sum + c.current_balance : sum),
      0,
    )
    const credit = customers.reduce(
      (sum, c) => (c.current_balance < 0 ? sum + Math.abs(c.current_balance) : sum),
      0,
    )
    return { totalCustomers: customers.length, outstanding, credit }
  }, [customersQuery.data])

  if (!isReady || !token) return null

  const tableColumnCount = isAdmin ? 5 : 4

  // ---------------------------------------------------------------------------
  // Table body states
  // ---------------------------------------------------------------------------
  const customerRows = customersQuery.isLoading ? (
    <TableStateRow
      colSpan={tableColumnCount}
      message={t("customers.directory.loading")}
      state="loading"
    />
  ) : customersQuery.isError ? (
    <TableStateRow
      colSpan={tableColumnCount}
      message={t("customers.directory.error")}
      state="error"
    />
  ) : filteredCustomers.length === 0 ? (
    <TableStateRow
      colSpan={tableColumnCount}
      message={t("customers.directory.empty")}
    />
  ) : (
    filteredCustomers.map((customer) => (
      <TableRow
        key={customer.id}
        className={styles.clickableRow}
        onClick={() => router.push(`/customers/${customer.id}`)}
        data-state={customer.is_active ? "active" : "inactive"}
      >
        {/* Name + initials */}
        <TableCell>
          <div className={patterns.row}>
            <InitialsAvatar value={customer.full_name} />
            <div>
              <div className={styles.customerName}>
                {customer.full_name}
              </div>
              <div className={styles.customerId}>
                #{customer.id.slice(0, 8)}
              </div>
            </div>
          </div>
        </TableCell>

        {/* Phone */}
        <TableCell className={styles.phone}>
          {customer.phone ?? t("financeDocuments.common.notUpdated")}
        </TableCell>

        {/* Status */}
        <TableCell>
          <StatusChip tone={customer.is_active ? "success" : "warning"}>
            {customer.is_active
              ? t("customers.management.statuses.active")
              : t("customers.management.statuses.archived")}
          </StatusChip>
        </TableCell>

        {/* Balance */}
        <TableCell className={styles.balanceCell}>
          <div className={styles.balance}>
            {customer.current_balance < 0 ? (
              <StatusChip tone="info">
                {t("customers.ledger.balanceStates.credit")}
              </StatusChip>
            ) : null}
            <span
              className={cn(
                styles.balanceValue,
                customer.current_balance > 0
                  ? styles.balanceDebt
                  : customer.current_balance < 0
                    ? styles.balanceCredit
                    : undefined,
              )}
            >
              {formatCurrency(Math.abs(customer.current_balance))}
            </span>
            <ArrowRight className={styles.rowArrow} aria-hidden="true" />
          </div>
        </TableCell>

        {/* Admin actions */}
        {isAdmin ? (
          <TableCell>
            <div className={styles.actions}>
              <Button
                disabled={Boolean(isMutatingCustomerId)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedCustomer(customer)
                  setEditName(customer.full_name)
                  setIsEditOpen(true)
                }}
                size="icon"
                type="button"
                variant="ghost"
                title={t("customers.management.editAction")}
              >
                <PencilLine className={patterns.iconCompact} />
              </Button>
              <Button
                disabled={Boolean(isMutatingCustomerId)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedCustomer(customer)
                  setIsDeleteOpen(true)
                }}
                size="icon"
                type="button"
                variant="destructive"
                title={t("customers.management.deleteAction")}
              >
                <Trash2 className={patterns.iconCompact} />
              </Button>
            </div>
          </TableCell>
        ) : null}
      </TableRow>
    ))
  )

  return (
    <div className={patterns.pageStack}>

      {/* ------------------------------------------------------------------ */}
      {/* Page action bar                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className={styles.actionBar}>
        <div className={styles.search}>
          <Search className={styles.searchIcon} aria-hidden="true" />
          <Input
            className={styles.searchInput}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t("customers.directory.searchPlaceholder")}
            value={searchValue}
          />
        </div>
        {isAdmin ? (
          <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm">
                <Plus className={patterns.iconSmall} />
                {t("customers.management.createAction")}
              </Button>
            </DialogTrigger>
            <DialogContent width="min(92vw, 42rem)">
              <DialogHeader>
                <DialogTitle>{t("customers.management.dialogs.create.title")}</DialogTitle>
                <DialogDescription>
                  {t("customers.management.dialogs.create.description")}
                </DialogDescription>
              </DialogHeader>
              <div className={patterns.grid}>
                <div className={patterns.fieldStack}>
                  <Label htmlFor="create-customer-name">
                    {t("customers.management.fields.name")}
                  </Label>
                  <Input
                    id="create-customer-name"
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder={t("customers.management.fields.namePlaceholder")}
                    value={createName}
                  />
                </div>
                <div className={patterns.fieldStack}>
                  <Label htmlFor="create-customer-type">
                    {t("customers.management.fields.type")}
                  </Label>
                  <select
                    className={selectInputClassName}
                    id="create-customer-type"
                    onChange={(e) => setCreateType(e.target.value as "INDIVIDUAL" | "BUSINESS")}
                    value={createType}
                  >
                    <option value="INDIVIDUAL">{t("customers.management.types.INDIVIDUAL")}</option>
                    <option value="BUSINESS">{t("customers.management.types.BUSINESS")}</option>
                  </select>
                </div>
                <div className={patterns.twoColumnGrid}>
                  <div className={patterns.fieldStack}>
                    <Label htmlFor="create-customer-phone">
                      {t("customers.management.fields.phone")}
                    </Label>
                    <Input
                      id="create-customer-phone"
                      onChange={(e) => setCreatePhone(e.target.value)}
                      placeholder={t("customers.management.fields.phonePlaceholder")}
                      value={createPhone}
                    />
                  </div>
                  <div className={patterns.fieldStack}>
                    <Label htmlFor="create-customer-email">
                      {t("customers.management.fields.email")}
                    </Label>
                    <Input
                      id="create-customer-email"
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder={t("customers.management.fields.emailPlaceholder")}
                      value={createEmail}
                    />
                  </div>
                </div>
                <div className={patterns.fieldStack}>
                  <Label htmlFor="create-customer-address">
                    {t("customers.management.fields.address")}
                  </Label>
                  <Input
                    id="create-customer-address"
                    onChange={(e) => setCreateAddress(e.target.value)}
                    placeholder={t("customers.management.fields.addressPlaceholder")}
                    value={createAddress}
                  />
                </div>
                <div className={patterns.fieldStack}>
                  <Label htmlFor="create-customer-tax-code">
                    {t("customers.management.fields.taxCode")}
                  </Label>
                  <Input
                    id="create-customer-tax-code"
                    onChange={(e) => setCreateTaxCode(e.target.value)}
                    placeholder={t("customers.management.fields.taxCodePlaceholder")}
                    value={createTaxCode}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsCreateOpen(false)} type="button" variant="outline">
                  {t("customers.management.dialogs.cancel")}
                </Button>
                <Button
                  disabled={isSubmittingCreate}
                  onClick={() => void createCustomer()}
                  type="button"
                >
                  {isSubmittingCreate && (
                    <Loader2 className={cn(patterns.iconSmall, patterns.spinner)} />
                  )}
                  {t("customers.management.dialogs.create.submit")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Metric strip                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className={patterns.threeColumnGrid}>
        <MetricCard
          icon={Users}
          label={t("customers.directory.metrics.totalCustomers")}
          value={customersQuery.isLoading ? "—" : directoryStats.totalCustomers}
        />
        <MetricCard
          icon={Landmark}
          label={t("dashboard.summary.widgets.receivables.label")}
          value={customersQuery.isLoading ? "—" : formatCurrency(directoryStats.outstanding)}
        />
        <MetricCard
          icon={WalletCards}
          label={t("customers.ledger.balanceStates.credit")}
          value={customersQuery.isLoading ? "—" : formatCurrency(directoryStats.credit)}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Customer table                                                      */}
      {/* ------------------------------------------------------------------ */}
      <Panel>
        <div className={styles.tableHeader}>
          <p className={patterns.accentEyebrow}>
            {t("customers.directory.title")}
          </p>
          {customersQuery.data && (
            <span className={patterns.supportingText}>
              {filteredCustomers.length} / {customersQuery.data.length}
            </span>
          )}
        </div>
        <TableScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("financeDocuments.common.customer")}</TableHead>
                <TableHead>{t("customers.directory.columns.phone")}</TableHead>
                <TableHead>{t("customers.management.fields.status")}</TableHead>
                <TableHead className={styles.balanceCell}>{t("customers.ledger.currentBalance")}</TableHead>
                {isAdmin ? (
                  <TableHead className={styles.actionsHeading}>{t("customers.directory.columns.actions")}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>{customerRows}</TableBody>
          </Table>
        </TableScrollArea>
      </Panel>

      {/* ------------------------------------------------------------------ */}
      {/* Admin dialogs — edit & delete                                       */}
      {/* ------------------------------------------------------------------ */}
      {isAdmin ? (
        <>
          <Dialog onOpenChange={setIsEditOpen} open={isEditOpen}>
            <DialogContent width="min(92vw, 32rem)">
              <DialogHeader>
                <DialogTitle>{t("customers.management.dialogs.edit.title")}</DialogTitle>
                <DialogDescription>
                  {t("customers.management.dialogs.edit.description")}
                </DialogDescription>
              </DialogHeader>
              <div className={patterns.fieldStack}>
                <Label htmlFor="edit-customer-name">
                  {t("customers.management.fields.name")}
                </Label>
                <Input
                  id="edit-customer-name"
                  onChange={(e) => setEditName(e.target.value)}
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
                    if (!selectedCustomer || !editName.trim()) return
                    void updateCustomerInline(selectedCustomer.id, { name: editName.trim() })
                  }}
                  type="button"
                >
                  {isSubmittingEdit && (
                    <Loader2 className={cn(patterns.iconSmall, patterns.spinner)} />
                  )}
                  {t("customers.management.dialogs.edit.submit")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
            <DialogContent width="min(92vw, 32rem)" purpose="required">
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
                    if (!selectedCustomer) return
                    void deleteCustomer(selectedCustomer.id)
                  }}
                  type="button"
                  variant="destructive"
                >
                  {isSubmittingDelete && (
                    <Loader2 className={cn(patterns.iconSmall, patterns.spinner)} />
                  )}
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
