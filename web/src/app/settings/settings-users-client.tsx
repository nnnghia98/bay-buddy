"use client"

import * as React from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2, ShieldCheck, ShieldOff, UserCog, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  createUserAction,
  toggleUserActiveAction,
  updateUserAction,
} from "@/actions/settings-users"
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
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import {
  createCreateUserFormSchema,
  createUpdateUserFormSchema,
  getSettingsUserValidationMessages,
  initialSettingsUserActionState,
  type SettingsUserActionField,
  type SettingsUserActionState,
  type UserRead,
} from "@/schemas"

type SettingsUsersClientProps = {
  currentUser: UserRead
  users: UserRead[]
}

type UserEditorProps = {
  mode: "create" | "edit"
  user?: UserRead
}

type ClientErrors = Partial<Record<SettingsUserActionField, string>>

function SettingsActionSubmitButton({
  idleLabel,
  pendingLabel,
  variant = "default",
}: {
  idleLabel: string
  pendingLabel: string
  variant?: "default" | "outline"
}) {
  const { pending } = useFormStatus()

  return (
    <Button disabled={pending} type="submit" variant={variant}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </Button>
  )
}

function formatRoleLabel(role: UserRead["role"], t: ReturnType<typeof useI18n>): string {
  return t(`settings.users.roles.${role}`)
}

function getFieldError(
  field: SettingsUserActionField,
  clientErrors: ClientErrors,
  state: SettingsUserActionState,
): string | undefined {
  return clientErrors[field] ?? state.fieldErrors[field]
}

function UserEditorDialog({ mode, user }: UserEditorProps) {
  const t = useI18n()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [clientErrors, setClientErrors] = React.useState<ClientErrors>({})
  const [username, setUsername] = React.useState(user?.username ?? "")
  const [password, setPassword] = React.useState("")
  const [role, setRole] = React.useState<UserRead["role"]>(user?.role ?? "STAFF")
  const [isActive, setIsActive] = React.useState(user?.is_active ?? true)
  const [state, formAction] = useActionState(
    mode === "create" ? createUserAction : updateUserAction,
    initialSettingsUserActionState,
  )

  const validationMessages = React.useMemo(
    () => getSettingsUserValidationMessages(t),
    [t],
  )
  const createUserFormSchema = React.useMemo(
    () => createCreateUserFormSchema(validationMessages),
    [validationMessages],
  )
  const updateUserFormSchema = React.useMemo(
    () => createUpdateUserFormSchema(validationMessages),
    [validationMessages],
  )

  React.useEffect(() => {
    if (open) {
      setUsername(user?.username ?? "")
      setPassword("")
      setRole(user?.role ?? "STAFF")
      setIsActive(user?.is_active ?? true)
      setClientErrors({})
    }
  }, [open, user])

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? t("settings.users.actions.updateSuccess"))
      setOpen(false)
      setClientErrors({})
      router.refresh()
      return
    }

    if (state.status === "error" && state.submittedAt) {
      toast.error(state.message ?? t("settings.users.actions.failure"))
    }
  }, [router, state, t])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget)
    const parsedValues =
      mode === "create"
        ? createUserFormSchema.safeParse({
            username: formData.get("username"),
            password: formData.get("password"),
            role: formData.get("role"),
            is_active: formData.get("is_active"),
          })
        : updateUserFormSchema.safeParse({
            user_id: formData.get("user_id"),
            username: formData.get("username"),
            password: formData.get("password"),
            role: formData.get("role"),
            is_active: formData.get("is_active"),
          })

    if (!parsedValues.success) {
      event.preventDefault()

      const flattenedErrors = parsedValues.error.flatten().fieldErrors
      setClientErrors({
        user_id: flattenedErrors.user_id?.[0],
        username: flattenedErrors.username?.[0],
        password: flattenedErrors.password?.[0],
        role: flattenedErrors.role?.[0],
        is_active: flattenedErrors.is_active?.[0],
      })
      return
    }

    setClientErrors({})
  }

  const isCreateMode = mode === "create"
  const dialogTitle = isCreateMode
    ? t("settings.users.dialogs.create.title")
    : t("settings.users.dialogs.edit.title")
  const dialogDescription = isCreateMode
    ? t("settings.users.dialogs.create.description")
    : t("settings.users.dialogs.edit.description")
  const submitLabel = isCreateMode
    ? t("settings.users.dialogs.create.submit")
    : t("settings.users.dialogs.edit.submit")
  const pendingLabel = isCreateMode
    ? t("settings.users.dialogs.create.submitting")
    : t("settings.users.dialogs.edit.submitting")

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        {isCreateMode ? (
          <Button>
            <UserPlus className="h-4 w-4" />
            {t("settings.users.createAction")}
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            {t("settings.users.editAction")}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="w-[min(92vw,34rem)]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-5" onSubmit={handleSubmit}>
          {!isCreateMode && user ? (
            <input name="user_id" type="hidden" value={user.id} />
          ) : null}

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-username`}>
                {t("settings.users.fields.username")}
              </Label>
              <Input
                id={`${mode}-username`}
                name="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("settings.users.fields.usernamePlaceholder")}
                value={username}
              />
              {getFieldError("username", clientErrors, state) ? (
                <p className="text-sm text-red-600">
                  {getFieldError("username", clientErrors, state)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${mode}-password`}>
                {t("settings.users.fields.password")}
              </Label>
              <Input
                id={`${mode}-password`}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("settings.users.fields.passwordPlaceholder")}
                type="password"
                value={password}
              />
              {!isCreateMode ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  {t("settings.users.fields.passwordHint")}
                </p>
              ) : null}
              {getFieldError("password", clientErrors, state) ? (
                <p className="text-sm text-red-600">
                  {getFieldError("password", clientErrors, state)}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${mode}-role`}>
                  {t("settings.users.fields.role")}
                </Label>
                <select
                  className="flex h-11 w-full rounded-[14px] border border-input bg-white px-3.5 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary"
                  id={`${mode}-role`}
                  name="role"
                  onChange={(event) => setRole(event.target.value as UserRead["role"])}
                  value={role}
                >
                  <option value="ADMIN">{t("settings.users.roles.ADMIN")}</option>
                  <option value="STAFF">{t("settings.users.roles.STAFF")}</option>
                </select>
                {getFieldError("role", clientErrors, state) ? (
                  <p className="text-sm text-red-600">
                    {getFieldError("role", clientErrors, state)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${mode}-status`}>
                  {t("settings.users.fields.status")}
                </Label>
                <select
                  className="flex h-11 w-full rounded-[14px] border border-input bg-white px-3.5 py-2 text-sm text-foreground shadow-[var(--shadow-sm)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-primary"
                  id={`${mode}-status`}
                  name="is_active"
                  onChange={(event) => setIsActive(event.target.value === "true")}
                  value={String(isActive)}
                >
                  <option value="true">{t("settings.users.statuses.active")}</option>
                  <option value="false">{t("settings.users.statuses.inactive")}</option>
                </select>
                {getFieldError("is_active", clientErrors, state) ? (
                  <p className="text-sm text-red-600">
                    {getFieldError("is_active", clientErrors, state)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              {t("settings.users.dialogs.cancel")}
            </Button>
            <SettingsActionSubmitButton
              idleLabel={submitLabel}
              pendingLabel={pendingLabel}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ToggleUserStatusButton({
  user,
  isCurrentUser,
}: {
  user: UserRead
  isCurrentUser: boolean
}) {
  const t = useI18n()
  const router = useRouter()
  const [state, formAction] = useActionState(
    toggleUserActiveAction,
    initialSettingsUserActionState,
  )

  React.useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? t("settings.users.actions.toggleSuccess"))
      router.refresh()
      return
    }

    if (state.status === "error" && state.submittedAt) {
      toast.error(state.message ?? t("settings.users.actions.failure"))
    }
  }, [router, state, t])

  if (isCurrentUser) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        {t("settings.users.currentSession")}
      </span>
    )
  }

  return (
    <form action={formAction}>
      <input name="user_id" type="hidden" value={user.id} />
      <input name="is_active" type="hidden" value={String(!user.is_active)} />
      <SettingsActionSubmitButton
        idleLabel={
          user.is_active
            ? t("settings.users.deactivateAction")
            : t("settings.users.reactivateAction")
        }
        pendingLabel={t("settings.users.toggleSubmitting")}
        variant="outline"
      />
    </form>
  )
}

export function SettingsUsersClient({
  currentUser,
  users,
}: SettingsUsersClientProps) {
  const t = useI18n()

  if (currentUser.role !== "ADMIN") {
    return (
      <div className="space-y-4 text-foreground">
        <CommandPanel>
          <CommandPanelHeader
            eyebrow={t("settings.eyebrow")}
            title={t("settings.restricted.title")}
            description={t("settings.restricted.description")}
          />
          <div className="flex items-start gap-4 px-4 py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-amber-200 bg-amber-50 text-amber-800">
              <ShieldOff className="h-5 w-5" />
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("settings.restricted.contact")}
            </p>
          </div>
        </CommandPanel>
      </div>
    )
  }

  const activeUsers = users.filter((user) => user.is_active).length
  const inactiveUsers = users.length - activeUsers

  return (
    <div className="space-y-4 text-foreground">
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("settings.users.eyebrow")}
          title={t("settings.users.title")}
          description={t("settings.users.description")}
          action={<UserEditorDialog mode="create" />}
        />
        <div className="grid gap-3 border-b border-border px-4 py-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("settings.users.metrics.total")}
            </p>
            <p className="mt-2 text-2xl font-medium text-foreground">{users.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("settings.users.metrics.active")}
            </p>
            <p className="mt-2 text-2xl font-medium text-foreground">{activeUsers}</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("settings.users.metrics.inactive")}
            </p>
            <p className="mt-2 text-2xl font-medium text-foreground">{inactiveUsers}</p>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground">
              {t("settings.users.empty")}
            </p>
          </div>
        ) : (
          <TableScrollArea>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/55 hover:bg-secondary/55">
                  <TableHead>{t("settings.users.columns.username")}</TableHead>
                  <TableHead>{t("settings.users.columns.role")}</TableHead>
                  <TableHead>{t("settings.users.columns.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("settings.users.columns.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isCurrentUser = currentUser.id === user.id

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-[14px] border text-primary",
                              user.is_active
                                ? "border-primary/15 bg-accent"
                                : "border-border bg-secondary/50 text-muted-foreground",
                            )}
                          >
                            <UserCog className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{user.username}</p>
                            <p className="text-xs text-muted-foreground">{user.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatRoleLabel(user.role, t)}</TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-2">
                          <StatusChip tone={user.is_active ? "success" : "warning"}>
                            {user.is_active
                              ? t("settings.users.statuses.active")
                              : t("settings.users.statuses.inactive")}
                          </StatusChip>
                          {isCurrentUser ? (
                            <StatusChip tone="info">
                              {t("settings.users.currentUserChip")}
                            </StatusChip>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <UserEditorDialog mode="edit" user={user} />
                          <ToggleUserStatusButton
                            isCurrentUser={isCurrentUser}
                            user={user}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableScrollArea>
        )}
      </CommandPanel>

      <CommandPanel>
        <CommandPanelHeader
          title={t("settings.guidance.title")}
          description={t("settings.guidance.description")}
        />
        <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                {t("settings.guidance.access")}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/35 p-4">
            <div className="flex items-start gap-3">
              <UserCog className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                {t("settings.guidance.status")}
              </p>
            </div>
          </div>
        </div>
      </CommandPanel>
    </div>
  )
}
