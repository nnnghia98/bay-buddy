"use client"

import * as React from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import * as z from "zod"
import { KeyRound, Loader2, Lock, User } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"
import { useI18n } from "@/locales/client"

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const internalLoginSchema = z.object({
  accessCode: z.string().min(1),
})

type LoginValues = z.infer<typeof loginSchema>
type InternalLoginValues = z.infer<typeof internalLoginSchema>

type LoginResponse = {
  access_token: string
  token_type: "bearer"
}

async function loginRequest(values: LoginValues): Promise<LoginResponse> {
  const body = new URLSearchParams({
    username: values.username,
    password: values.password,
    grant_type: "password",
  })

  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
}

async function internalLoginRequest(
  values: InternalLoginValues,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/internal-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_code: values.accessCode }),
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const router = useRouter()
  const t = useI18n()
  const { login, token, isReady } = useAuth()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [usePasswordLogin, setUsePasswordLogin] = React.useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })
  const internalForm = useForm<InternalLoginValues>({
    resolver: zodResolver(internalLoginSchema),
    defaultValues: { accessCode: "" },
  })

  React.useEffect(() => {
    if (isReady && token) {
      router.replace("/")
    }
  }, [isReady, router, token])

  const onSubmit = async (values: LoginValues) => {
    setIsSubmitting(true)
    try {
      const response = await loginRequest(values)
      login(response.access_token)
      toast.success(t("login.successToast"))
      router.replace("/")
    } catch (error) {
      const message = error instanceof Error ? error.message : t("login.error")
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onInternalSubmit = async (values: InternalLoginValues) => {
    setIsSubmitting(true)
    try {
      const response = await internalLoginRequest(values)
      login(response.access_token)
      toast.success(t("login.successToast"))
      router.replace("/")
    } catch (error) {
      const message = error instanceof Error ? error.message : t("login.error")
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            alt="Bay Buddy"
            className="h-14 w-auto object-contain"
            height={820}
            priority
            src="/branding/logo-bay-buddy-v1-crop.png"
            width={1020}
          />
        </div>

        {/* Heading */}
        <div className="mb-8 space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
            {t("login.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("login.subtitle")}
          </p>
        </div>

        {usePasswordLogin ? (
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="username">{t("login.usernameLabel")}</Label>
              <div className="relative">
                <User
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect="off"
                  className="pl-10 text-base md:text-sm"
                  id="username"
                  placeholder={t("login.usernamePlaceholder")}
                  spellCheck={false}
                  {...form.register("username")}
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-xs text-red-600" role="alert">
                  {t("login.usernameRequired")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("login.passwordLabel")}</Label>
              <div className="relative">
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  autoComplete="current-password"
                  className="pl-10"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  {...form.register("password")}
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-600" role="alert">
                  {t("login.passwordRequired")}
                </p>
              )}
            </div>

            <Button
              className="w-full justify-center"
              disabled={isSubmitting}
              id="login-submit-btn"
              size="lg"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("login.submitting")}
                </>
              ) : (
                t("login.submit")
              )}
            </Button>
            <button
              className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => setUsePasswordLogin(false)}
              type="button"
            >
              {t("login.useAccessCode")}
            </button>
          </form>
        ) : (
          <form
            className="space-y-5"
            onSubmit={internalForm.handleSubmit(onInternalSubmit)}
          >
            <div className="space-y-2">
              <Label htmlFor="access-code">{t("login.accessCodeLabel")}</Label>
              <div className="relative">
                <KeyRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  autoComplete="current-password"
                  className="pl-10"
                  id="access-code"
                  placeholder={t("login.accessCodePlaceholder")}
                  type="password"
                  {...internalForm.register("accessCode")}
                />
              </div>
              {internalForm.formState.errors.accessCode && (
                <p className="text-xs text-red-600" role="alert">
                  {t("login.accessCodeRequired")}
                </p>
              )}
            </div>

            <Button
              className="w-full justify-center"
              disabled={isSubmitting}
              id="login-submit-btn"
              size="lg"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("login.submitting")}
                </>
              ) : (
                t("login.submit")
              )}
            </Button>

            <button
              className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => setUsePasswordLogin(true)}
              type="button"
            >
              {t("login.usePassword")}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Bay Buddy &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
