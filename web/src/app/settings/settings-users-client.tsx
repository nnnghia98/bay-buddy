"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import {
  Loader2,
  ShieldCheck,
  ShieldOff,
  UserCog,
  UserPlus,
  UsersRound,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  EmptyState,
  MetricCard,
  Panel,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
import {
  InitialsAvatar,
  RestrictedAccessPanel,
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
import { apiFetchData } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import {
  createCreateUserFormSchema,
  createUpdateUserFormSchema,
  getSettingsUserValidationMessages,
  type SettingsUserActionField,
  type UserRead,
} from "@/schemas"
import styles from "./settings-users.module.css"

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
  pending,
  variant = "default",
}: {
  idleLabel: string
  pendingLabel: string
  pending: boolean
  variant?: "default" | "outline"
}) {
  return (
    <Button disabled={pending} type="submit" variant={variant}>
      {pending ? (
        <>
          <Loader2 className={`${patterns.iconSmall} ${patterns.spinner}`} />
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
  serverErrors: ClientErrors,
): string | undefined {
  return clientErrors[field] ?? serverErrors[field]
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
  const [isPending, setIsPending] = React.useState(false)
  const [serverErrors, setServerErrors] = React.useState<ClientErrors>({})

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
      setServerErrors({})
    }
  }, [open, user])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setServerErrors({})

    if (mode === "create") {
      const parsedValues = createUserFormSchema.safeParse({
        username: formData.get("username"),
        password: formData.get("password"),
        role: formData.get("role"),
        is_active: formData.get("is_active"),
      })

      if (!parsedValues.success) {
        const flattenedErrors = parsedValues.error.flatten().fieldErrors
        setClientErrors({
          username: flattenedErrors.username?.[0],
          password: flattenedErrors.password?.[0],
          role: flattenedErrors.role?.[0],
          is_active: flattenedErrors.is_active?.[0],
        })
        return
      }
    } else {
      const parsedValues = updateUserFormSchema.safeParse({
        user_id: formData.get("user_id"),
        username: formData.get("username"),
        password: formData.get("password"),
        role: formData.get("role"),
        is_active: formData.get("is_active"),
      })

      if (!parsedValues.success) {
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
    }

    setClientErrors({})
    setIsPending(true)

    const payload = {
      username: String(formData.get("username") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? "STAFF"),
      is_active: String(formData.get("is_active") ?? "true") === "true",
    }

    const submitPromise =
      mode === "create"
        ? apiFetchData<unknown>("/users/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
        : apiFetchData<unknown>(`/users/${user?.id ?? ""}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...payload,
              password: payload.password.trim() ? payload.password : undefined,
            }),
          })

    void submitPromise
      .then(() => {
        toast.success(
          mode === "create"
            ? t("settings.users.actions.createSuccess")
            : t("settings.users.actions.updateSuccess"),
        )
        setOpen(false)
        setClientErrors({})
        setServerErrors({})
        router.refresh()
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : t("settings.users.actions.failure")
        toast.error(message)
      })
      .finally(() => {
        setIsPending(false)
      })
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
            <UserPlus className={patterns.iconSmall} />
            {t("settings.users.createAction")}
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            {t("settings.users.editAction")}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent width="min(92vw, 34rem)">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <form className={patterns.contentStack} onSubmit={handleSubmit}>
          {!isCreateMode && user ? (
            <input name="user_id" type="hidden" value={user.id} />
          ) : null}

          <div className={patterns.grid}>
            <div className={patterns.fieldStack}>
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
              {getFieldError("username", clientErrors, serverErrors) ? (
                <p className={patterns.errorText}>
                  {getFieldError("username", clientErrors, serverErrors)}
                </p>
              ) : null}
            </div>

            <div className={patterns.fieldStack}>
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
                <p className={patterns.supportingText}>
                  {t("settings.users.fields.passwordHint")}
                </p>
              ) : null}
              {getFieldError("password", clientErrors, serverErrors) ? (
                <p className={patterns.errorText}>
                  {getFieldError("password", clientErrors, serverErrors)}
                </p>
              ) : null}
            </div>

            <div className={patterns.twoColumnGrid}>
              <div className={patterns.fieldStack}>
                <Label htmlFor={`${mode}-role`}>
                  {t("settings.users.fields.role")}
                </Label>
                <select
                  className={selectInputClassName}
                  id={`${mode}-role`}
                  name="role"
                  onChange={(event) => setRole(event.target.value as UserRead["role"])}
                  value={role}
                >
                  <option value="ADMIN">{t("settings.users.roles.ADMIN")}</option>
                  <option value="STAFF">{t("settings.users.roles.STAFF")}</option>
                </select>
                {getFieldError("role", clientErrors, serverErrors) ? (
                  <p className={patterns.errorText}>
                    {getFieldError("role", clientErrors, serverErrors)}
                  </p>
                ) : null}
              </div>

              <div className={patterns.fieldStack}>
                <Label htmlFor={`${mode}-status`}>
                  {t("settings.users.fields.status")}
                </Label>
                <select
                  className={selectInputClassName}
                  id={`${mode}-status`}
                  name="is_active"
                  onChange={(event) => setIsActive(event.target.value === "true")}
                  value={String(isActive)}
                >
                  <option value="true">{t("settings.users.statuses.active")}</option>
                  <option value="false">{t("settings.users.statuses.inactive")}</option>
                </select>
                {getFieldError("is_active", clientErrors, serverErrors) ? (
                  <p className={patterns.errorText}>
                    {getFieldError("is_active", clientErrors, serverErrors)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setOpen(false)} type="button" variant="outline">
              {t("settings.users.dialogs.cancel")}
            </Button>
            <SettingsActionSubmitButton
              idleLabel={submitLabel}
              pendingLabel={pendingLabel}
              pending={isPending}
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
  const [isPending, setIsPending] = React.useState(false)

  if (isCurrentUser) {
    return (
      <span className={patterns.supportingText}>
        {t("settings.users.currentSession")}
      </span>
    )
  }

  return (
    <Button
      disabled={isPending}
      onClick={() => {
        setIsPending(true)
        void apiFetchData(`/users/${user.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: !user.is_active,
          }),
        })
          .then(() => {
            toast.success(t("settings.users.actions.toggleSuccess"))
            router.refresh()
          })
          .catch((error) => {
            const message =
              error instanceof Error ? error.message : t("settings.users.actions.failure")
            toast.error(message)
          })
          .finally(() => {
            setIsPending(false)
          })
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      {isPending ? (
        <>
          <Loader2 className={`${patterns.iconSmall} ${patterns.spinner}`} />
          {t("settings.users.toggleSubmitting")}
        </>
      ) : user.is_active ? (
        t("settings.users.deactivateAction")
      ) : (
        t("settings.users.reactivateAction")
      )}
    </Button>
  )
}

export function SettingsUsersClient({
  currentUser,
  users,
}: SettingsUsersClientProps) {
  const t = useI18n()

  if (currentUser.role !== "ADMIN") {
    return (
      <RestrictedAccessPanel
        title={t("settings.restricted.title")}
        description={t("settings.restricted.contact")}
      />
    )
  }

  const activeUsers = users.filter((user) => user.is_active).length
  const inactiveUsers = users.length - activeUsers
  const metricItems = [
    {
      label: t("settings.users.metrics.total"),
      value: users.length,
      icon: UsersRound,
    },
    {
      label: t("settings.users.metrics.active"),
      value: activeUsers,
      icon: ShieldCheck,
    },
    {
      label: t("settings.users.metrics.inactive"),
      value: inactiveUsers,
      icon: ShieldOff,
    },
  ]

  return (
    <div className={patterns.pageStack}>
      <header className={styles.pageHeader}>
        <div className={patterns.minWidthZero}>
          <p className={patterns.accentEyebrow}>
            {t("settings.users.eyebrow")}
          </p>
          <h1 className={styles.pageTitle}>
            {t("settings.users.title")}
          </h1>
          <p className={styles.pageDescription}>
            {t("settings.users.description")}
          </p>
        </div>
        <div className={patterns.shrinkNone}>
          <UserEditorDialog mode="create" />
        </div>
      </header>

      <div className={patterns.threeColumnGrid}>
        {metricItems.map((metric) => (
          <MetricCard
            icon={metric.icon}
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>

      <div className={styles.contentGrid}>
        <Panel>
          {users.length === 0 ? (
            <EmptyState icon={UsersRound} message={t("settings.users.empty")} />
          ) : (
            <TableScrollArea>
              <Table className={styles.userTable}>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t("settings.users.columns.username")}
                    </TableHead>
                    <TableHead>
                      {t("settings.users.columns.role")}
                    </TableHead>
                    <TableHead>
                      {t("settings.users.columns.status")}
                    </TableHead>
                    <TableHead className={styles.actionsHeading}>
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
                          <div className={patterns.row}>
                            <InitialsAvatar value={user.username} />
                            <div>
                              <p className={patterns.labelText}>
                                {user.username}
                              </p>
                              <p className={styles.userId}>
                                #{user.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusChip>
                            {formatRoleLabel(user.role, t)}
                          </StatusChip>
                        </TableCell>
                        <TableCell>
                          <div className={styles.statusGroup}>
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
                        <TableCell className={styles.actionsCell}>
                          <div className={patterns.endRow}>
                            <UserEditorDialog mode="edit" user={user} />
                            <ToggleUserStatusButton isCurrentUser={isCurrentUser} user={user} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableScrollArea>
          )}
        </Panel>

        <aside>
          <Panel>
            <div className={styles.guidanceHeader}>
              <p className={patterns.accentEyebrow}>
                {t("settings.guidance.title")}
              </p>
              <p className={cn(patterns.mutedText, styles.guidanceDescription)}>
                {t("settings.guidance.description")}
              </p>
            </div>
            <div className={patterns.dividerList}>
              <div className={styles.guidanceItem}>
                <div className={styles.guidanceIcon}>
                  <ShieldCheck className={patterns.iconSmall} aria-hidden="true" />
                </div>
                <p className={patterns.mutedText}>
                  {t("settings.guidance.access")}
                </p>
              </div>
              <div className={styles.guidanceItem}>
                <div className={styles.guidanceIcon}>
                  <UserCog className={patterns.iconSmall} aria-hidden="true" />
                </div>
                <p className={patterns.mutedText}>
                  {t("settings.guidance.status")}
                </p>
              </div>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
