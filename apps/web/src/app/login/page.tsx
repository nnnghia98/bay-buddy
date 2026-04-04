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
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
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
      router.replace("/tickets/capture")
    }
  }, [isReady, router, token])

  const onSubmit = async (values: LoginValues) => {
    setIsSubmitting(true)

    try {
      const response = await loginRequest(values)
      login(response.access_token)
      toast.success("Logged in successfully")
      router.replace("/tickets/capture")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-2xl shadow-blue-950/10 backdrop-blur sm:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-between gap-8 border-b border-slate-200/70 bg-slate-950 px-8 py-10 text-white sm:border-b-0 sm:border-r">
            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-200">
                Bay Buddy
              </p>
              <h1 className="max-w-md text-4xl font-semibold tracking-tight">
                Sign in to continue ticket capture and debt recording.
              </h1>
              <p className="max-w-md text-sm leading-6 text-slate-300">
                Use your staff account to open the capture screen, review parsed
                flight data, and save confirmed tickets with the proper JWT.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Protected save flow with bearer token support
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Redirects to /tickets/capture after login
              </div>
            </div>
          </div>

          <div className="px-8 py-10">
            <div className="mb-8 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-slate-600">
                Enter your credentials to generate an access token.
              </p>
            </div>

            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="username"
                    autoComplete="username"
                    className="pl-9"
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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="pl-9"
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

              <Button className="h-11 w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
