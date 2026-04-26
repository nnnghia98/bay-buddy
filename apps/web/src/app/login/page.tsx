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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
}

export default function LoginPage() {
  const router = useRouter()
  const { login, token, isReady } = useAuth()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
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
      toast.success("Logged in successfully")
      router.replace("/")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center justify-center">
        <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-border bg-white shadow-[var(--shadow-xl),var(--theme-shadow-soft)]">
          <div className="px-8 py-10 sm:px-10 sm:py-12">
            <div className="mb-8 space-y-2">
              <div className="inline-flex items-center">
                <Image
                  alt="Bay Buddy logo"
                  className="h-14 w-auto"
                  height={820}
                  priority
                  src="/branding/logo-bay-buddy-v1-crop.png"
                  width={1020}
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Tài khoản nội bộ
              </p>
              <h2 className="text-3xl font-medium tracking-[-0.02em] text-foreground">
                Chào mừng quay lại
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Nhập tên đăng nhập và mật khẩu để nhận access token làm việc.
              </p>
            </div>

            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    autoComplete="username"
                    className="pl-10"
                    placeholder="staff.username"
                    {...form.register("username")}
                  />
                </div>
                {form.formState.errors.username ? (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.username.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="pl-10"
                    placeholder="••••••••"
                    {...form.register("password")}
                  />
                </div>
                {form.formState.errors.password ? (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-[20px] border border-border bg-secondary px-4 py-4 text-sm leading-6 text-muted-foreground">
                Sau khi đăng nhập, hệ thống sẽ chuyển bạn đến màn hình nhập vé để tiếp tục thao tác.
              </div>

              <Button className="w-full justify-center" disabled={isSubmitting} size="lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang đăng nhập
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
