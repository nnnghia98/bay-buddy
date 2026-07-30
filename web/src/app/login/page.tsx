"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { Card } from "@astryxdesign/core/Card"
import { Heading } from "@astryxdesign/core/Heading"
import { VStack } from "@astryxdesign/core/Layout"
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
import { ThemeModeMenu } from "@/components/theme-mode-menu"
import { useAuth } from "@/lib/auth-context"
import { ApiError, apiFetch } from "@/lib/api"
import { useI18n } from "@/locales/client"
import styles from "./login.module.css"

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
    <div className={styles.page}>
      <div className={styles.themeMenu}>
        <ThemeModeMenu />
      </div>
      <Card className={styles.card} padding={8}>
        <VStack gap={8}>
        {/* Logo */}
        <div className={patterns.center}>
          <Image
            alt="Bay Buddy"
            className={styles.logo}
            height={820}
            priority
            src="/branding/logo-bay-buddy-v1-crop.png"
            width={1020}
          />
        </div>

        {/* Heading */}
        <div className={styles.heading}>
          <Heading level={1}>
            {t("login.title")}
          </Heading>
          <p className={patterns.mutedText}>
            {t("login.subtitle")}
          </p>
        </div>

        <form className={patterns.contentStack} onSubmit={form.handleSubmit(onSubmit)}>
          <div className={patterns.fieldStack}>
            <Label htmlFor="passcode">{t("login.passcodeLabel")}</Label>
            <div className={styles.inputWrapper}>
              <KeyRound
                aria-hidden="true"
                className={styles.inputIcon}
              />
              <Input
                autoComplete="current-password"
                autoFocus
                className={styles.inputWithIcon}
                id="passcode"
                placeholder={t("login.passcodePlaceholder")}
                type="password"
                {...form.register("passcode")}
              />
            </div>
            {form.formState.errors.passcode && (
              <p className={patterns.errorSupportingText} role="alert">
                {t("login.passcodeRequired")}
              </p>
            )}
          </div>

          <Button
            disabled={isSubmitting}
            id="login-submit-btn"
            size="lg"
            type="submit"
            width="100%"
          >
            {isSubmitting ? (
              <>
                <Loader2 className={`${patterns.iconSmall} ${patterns.spinner}`} aria-hidden="true" />
                {t("login.submitting")}
              </>
            ) : (
              t("login.submit")
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className={styles.footer}>
          Bay Buddy &copy; {new Date().getFullYear()}
        </p>
        </VStack>
      </Card>
    </div>
  )
}
