"use client"

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react"
import { Banner } from "@astryxdesign/core/Banner"
import { Input } from "@/components/ui/input"
import { buildIdentificationDocs, defaultCitizenIdExpiryDate, type IdentificationDocumentType } from "@/lib/identification-docs"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { ApiError, apiFetch } from "@/lib/api"
import { identificationResultSchema, identificationUploadSchema, type IdentificationResult } from "@/schemas/identification"
import styles from "./identification.module.css"

const fields = ["document_number", "full_name", "last_name", "first_name", "date_of_birth", "sex", "nationality", "place_of_birth", "place_of_origin", "address", "issue_date", "expiry_date", "issuing_authority"] as const

export default function IdentificationPage() {
  const t = useI18n()
  const [documentType, setDocumentType] = useState<IdentificationDocumentType>("identity_card")
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [result, setResult] = useState<IdentificationResult | null>(null)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const request = useRef<AbortController | null>(null)

  const previewUrls = useRef<string[]>([])
  function replaceFiles(selected: File[]) {
    previewUrls.current.forEach(url => { if (url) URL.revokeObjectURL(url) })
    const urls = selected.map(file => file.type.startsWith("image/") ? URL.createObjectURL(file) : "")
    previewUrls.current = urls
    setPreviews(urls)
    setFiles(selected)
  }
  useEffect(() => () => previewUrls.current.forEach(url => { if (url) URL.revokeObjectURL(url) }), [])
  useEffect(() => () => request.current?.abort(), [])

  function clear() {
    replaceFiles([])
    setResult(null)
    setError("")
    setCopied(false)
    if (input.current) input.current.value = ""
  }

  async function extract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = identificationUploadSchema.safeParse(files)
    if (!parsed.success) { setError(t("identification.invalidFiles")); return }
    setPending(true)
    setResult(null)
    setError("")
    setCopied(false)
    const controller = new AbortController()
    request.current = controller
    try {
      const body = new FormData()
      body.append("document_type", documentType)
      parsed.data.forEach(file => body.append("files", file))
      const payload = await apiFetch<unknown>("/ai/identification", { method: "POST", body, signal: controller.signal, cache: "no-store" })
      const extracted = identificationResultSchema.parse(payload)
      if (extracted.document_type !== documentType) throw new Error("Document type mismatch")
      setResult({ ...extracted, expiry_date: extracted.expiry_date ?? (documentType === "identity_card" ? defaultCitizenIdExpiryDate : null) })
    } catch (error) {
      if (controller.signal.aborted) return
      setError(error instanceof ApiError && error.status === 422 ? t("identification.unreadable") : error instanceof ApiError && error.status === 401 ? t("identification.sessionExpired") : t("identification.failed"))
    } finally {
      if (!controller.signal.aborted) setPending(false)
    }
  }

  const docsLine = result ? buildIdentificationDocs(documentType, result) : null

  async function copy() {
    if (!docsLine) return
    try {
      await navigator.clipboard.writeText(docsLine)
      setCopied(true)
    } catch { setError(t("identification.copyFailed")) }
  }

  function formatValue(field: string, value: string | null) {
    if (!value) return t("identification.notVisible")
    if (["date_of_birth", "issue_date", "expiry_date"].includes(field)) return value.split("-").reverse().join("/")
    return value
  }

  return <div className={styles.workbench}>
    <form className={styles.panel} onSubmit={extract} aria-busy={pending}>
      <h1 className={styles.heading}>{t("identification.upload")}</h1>
      <p className={styles.note}>{t("identification.privacy")}</p>
      <fieldset className={styles.typeSelector} disabled={pending}>
        <legend>{t("identification.documentType")}</legend>
        {(["identity_card", "passport"] as const).map(type => <label key={type}>
          <input type="radio" name="document_type" value={type} checked={documentType === type} onChange={() => { setDocumentType(type); setResult(null); setCopied(false); setError("") }} />
          {t(`identification.types.${type}`)}
        </label>)}
      </fieldset>
      <label className={styles.label} htmlFor="identification-files">{t("identification.files")}</label>
      <input ref={input} id="identification-files" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple disabled={pending} aria-describedby="identification-help" onChange={event => {
        const selected = Array.from(event.target.files ?? [])
        setResult(null); setCopied(false)
        if (selected.length && !identificationUploadSchema.safeParse(selected).success) {
          replaceFiles([]); setError(t("identification.invalidFiles")); event.target.value = ""
        } else { replaceFiles(selected); setError("") }
      }} />
      <p id="identification-help" className={styles.note}>{t("identification.help")}</p>
      <div className={styles.actions}>
        <Button type="submit" disabled={!files.length || pending}>{pending ? t("identification.extracting") : t("identification.extract")}</Button>
        <Button type="button" variant="outline" disabled={pending || (!files.length && !result)} onClick={clear}>{t("identification.clear")}</Button>
      </div>
      {error && <div role="alert"><Banner status="error" title={error} /></div>}
      <div className={styles.previews}>{files.map((file, index) => <figure key={`${index}-${file.name}`}>
        {previews[index] && <img src={previews[index]} alt={t("identification.preview")} />}
        <figcaption>{file.name}</figcaption>
      </figure>)}</div>
    </form>
    <section className={styles.panel} aria-live="polite" aria-busy={pending}>
      <div className={styles.actions}>
        <h2 className={styles.heading}>{t("identification.results")}</h2>
        {result && <Button type="button" variant="outline" disabled={!docsLine} onClick={copy}>{copied ? t("identification.copied") : t("identification.copy")}</Button>}
      </div>
      {result ? <>
        <p className={styles.note}>{t("identification.review")}</p>
        <label className={styles.label} htmlFor="sr-docs">{t("identification.docsLabel")}</label>
        <textarea id="sr-docs" className={styles.docsOutput} rows={3} readOnly value={docsLine ?? ""} aria-describedby="sr-docs-help" />
        <p id="sr-docs-help" className={styles.note}>{docsLine ? t("identification.docsHelp") : t("identification.docsIncomplete")}</p>
        <dl className={styles.details}>
          <div><dt>{t("identification.documentType")}</dt><dd>{t(`identification.types.${result.document_type}`)}</dd></div>
          {fields.map(field => <div key={field}><dt>{t(`identification.fields.${field}`)}</dt><dd>{["document_number", "last_name", "first_name", "date_of_birth", "sex", "expiry_date"].includes(field) ? <Input id={`identification-${field}`} aria-label={t(`identification.fields.${field}`)} type={["date_of_birth", "expiry_date"].includes(field) ? "date" : "text"} value={result[field] ?? ""} onChange={event => { setResult({ ...result, [field]: event.target.value || null }); setCopied(false) }} /> : formatValue(field, result[field])}</dd></div>)}
        </dl>
      </> : <p className={styles.note}>{pending ? t("identification.extracting") : t("identification.empty")}</p>}
    </section>
  </div>
}
