"use client"

import * as React from "react"
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
        <div className="grid w-full overflow-hidden rounded-[32px] border border-border bg-white shadow-[var(--shadow-xl),var(--theme-shadow-soft)] sm:grid-cols-[1.08fr_0.92fr]">
          <div className="relative overflow-hidden border-b border-border bg-[linear-gradient(180deg,#ffffff_0%,#f3f7fc_100%)] px-8 py-10 sm:border-b-0 sm:border-r sm:px-10 sm:py-12">
            <div className="absolute right-[-5rem] top-[-4rem] h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-[-6rem] left-[-4rem] h-56 w-56 rounded-full bg-accent blur-3xl" />

            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary shadow-[var(--shadow-sm)]">
                  Bay Buddy
                </div>
                <div className="space-y-4">
                  <h1 className="max-w-lg text-4xl font-medium leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl">
                    Đăng nhập để tiếp tục quy trình nhập vé và ghi nhận công nợ.
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-muted-foreground">
                    Giao diện vận hành được thiết kế cho đội ngũ Bay Buddy: nhập chứng từ nhanh,
                    kiểm tra dữ liệu trích xuất và lưu giao dịch với xác thực JWT đầy đủ.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 text-sm text-foreground sm:max-w-lg">
                <div className="rounded-[20px] border border-border bg-white px-4 py-4 shadow-[var(--shadow-sm)]">
                  Xác thực nhân sự trước mọi thao tác ghi dữ liệu vào tickets, customers và finance.
                </div>
                <div className="rounded-[20px] border border-border bg-white px-4 py-4 shadow-[var(--shadow-sm)]">
                  Truy cập trực tiếp vào màn hình nhập vé AI sau khi đăng nhập thành công.
                </div>
                <div className="rounded-[20px] border border-border bg-white px-4 py-4 shadow-[var(--shadow-sm)]">
                  Phù hợp cho luồng công việc khách hàng, vé máy bay và sổ công nợ theo chuẩn App Router.
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-10 sm:px-10 sm:py-12">
            <div className="mb-8 space-y-2">
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
