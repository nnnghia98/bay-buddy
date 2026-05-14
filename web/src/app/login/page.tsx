"use client"

import * as React from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import * as z from "zod"
import { Loader2, Lock, User } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api"
import { useI18n } from "@/locales/client"

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const router = useRouter()
  const t = useI18n()
  const { login, token, isReady } = useAuth()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
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
      const message = error instanceof Error ? error.message : "Unable to sign in"
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

        {/* Form */}
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">{t("login.usernameLabel")}</Label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="pl-10 text-base md:text-sm"
                placeholder={t("login.usernamePlaceholder")}
                {...form.register("username")}
              />
            </div>
            {form.formState.errors.username && (
              <p className="text-xs text-red-600">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">{t("login.passwordLabel")}</Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="pl-10"
                placeholder="••••••••"
                {...form.register("password")}
              />
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-red-600">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            className="w-full justify-center"
            disabled={isSubmitting}
            size="lg"
            type="submit"
            id="login-submit-btn"
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
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Bay Buddy &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
