"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"

export default function WorkbookSessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useI18n()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-72 flex-col items-start justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-6" role="alert">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-red-900">{t("workbookEditor.editor.errorBoundary.title")}</h1>
        <p className="text-sm text-red-700">{t("workbookEditor.editor.errorBoundary.description")}</p>
      </div>
      <Button onClick={reset} type="button" variant="outline">
        {t("workbookEditor.editor.actions.retry")}
      </Button>
    </div>
  )
}
