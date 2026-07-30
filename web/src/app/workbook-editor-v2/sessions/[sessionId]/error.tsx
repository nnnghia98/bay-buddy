"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import styles from "./session-state.module.css"

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
    <div className={styles.errorState} role="alert">
      <div className={styles.errorCopy}>
        <h1 className={styles.errorTitle}>{t("workbookEditor.editor.errorBoundary.title")}</h1>
        <p className={styles.errorDescription}>{t("workbookEditor.editor.errorBoundary.description")}</p>
      </div>
      <Button onClick={reset} type="button" variant="outline">
        {t("workbookEditor.editor.actions.retry")}
      </Button>
    </div>
  )
}
