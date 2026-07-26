"use client"

import * as React from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import * as z from "zod"
import { KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { ApiError, apiFetch } from "@/lib/api"
import { useI18n } from "@/locales/client"

const passcodeLoginSchema = z.object({
  passcode: z.string().min(1),
})

type PasscodeLoginValues = z.infer<typeof passcodeLoginSchema>

type LoginResponse = {
  access_token: string
  token_type: "bearer"
}

async function passcodeLoginRequest(
  values: PasscodeLoginValues,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/internal-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_code: values.passcode }),
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
  const form = useForm<PasscodeLoginValues>({
    resolver: zodResolver(passcodeLoginSchema),
    defaultValues: { passcode: "" },
  })

  React.useEffect(() => {
    if (isReady && token) {
      router.replace("/")
    }
  }, [isReady, router, token])

  const onSubmit = async (values: PasscodeLoginValues) => {
    setIsSubmitting(true)
    try {
      const response = await passcodeLoginRequest(values)
      login(response.access_token)
      toast.success(t("login.successToast"))
      router.replace("/")
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 401
          ? t("login.invalidPasscode")
          : t("login.error")
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

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="passcode">{t("login.passcodeLabel")}</Label>
            <div className="relative">
              <KeyRound
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                autoComplete="current-password"
                autoFocus
                className="pl-10"
                id="passcode"
                placeholder={t("login.passcodePlaceholder")}
                type="password"
                {...form.register("passcode")}
              />
            </div>
            {form.formState.errors.passcode && (
              <p className="text-xs text-red-600" role="alert">
                {t("login.passcodeRequired")}
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
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Bay Buddy &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
