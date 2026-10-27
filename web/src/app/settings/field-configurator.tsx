"use client"

import { useActionState, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Panel } from "@/components/command-center"
import { ActionSubmitButton } from "@/components/form-submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { selectInputClassName } from "@/components/operations-ui"
import { useI18n } from "@/locales/client"
import { fieldPreferenceSchema, fieldSettingsQueryKey, type FieldSettings } from "@/schemas/field-preferences"
import { saveFieldPreference, type FieldActionState } from "./field-actions"
import styles from "./field-configurator.module.css"

type CatalogField = FieldSettings["catalog"][number]

function FieldEditor({ field, settings, label }: { field: CatalogField; settings: FieldSettings; label: string }) {
  const t = useI18n()
  const queryClient = useQueryClient()
  const [state, action] = useActionState(saveFieldPreference, { status: "idle" } as FieldActionState)
  const [clientError, setClientError] = useState(false)
  const preference = settings.preferences[field.key]
  const isText = field.type === "string"
  const isNumber = ["number", "integer"].includes(field.type)
  useEffect(() => {
    if (state.status === "saved") void queryClient.invalidateQueries({ queryKey: fieldSettingsQueryKey })
  }, [state, queryClient])

  return <form action={action} className={styles.editor} onSubmit={event => {
    const form = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter)
    if (form.get("reset")) return
    const number = (key: string) => form.get(key) === "" ? null : Number(form.get(key))
    const parsed = fieldPreferenceSchema.safeParse({ label: form.get("label"), visible: form.get("visible") === "on", required: form.get("required") === "on", min_length: number("min_length"), max_length: number("max_length"), minimum: number("minimum"), maximum: number("maximum") })
    setClientError(!parsed.success)
    if (!parsed.success) event.preventDefault()
  }}>
    <input type="hidden" name="field" value={field.key} />
    <code className={styles.databaseName}>{field.key} · {field.type}</code>
    <Label htmlFor={`${field.key}-label`}>{t("settings.fields.uiName")}</Label>
    <Input id={`${field.key}-label`} name="label" defaultValue={preference?.label ?? ""} placeholder={label} maxLength={80} />
    <div className={styles.checks}>
      <label><input type="checkbox" name="visible" defaultChecked={preference?.visible ?? true} />{t("settings.fields.visible")}</label>
      <label><input type="checkbox" name="required" defaultChecked={preference?.required ?? false} />{t("settings.fields.required")}</label>
    </div>
    <div className={styles.rules}>
      {(["min_length", "max_length", "minimum", "maximum"] as const).map(key => <div key={key}>
        <Label htmlFor={`${field.key}-${key}`}>{t(`settings.fields.${key}`)}</Label>
        <Input id={`${field.key}-${key}`} type="number" name={key} step={key.endsWith("length") ? 1 : "any"} min={key === "min_length" ? 0 : key === "max_length" ? 1 : undefined} max={key.endsWith("length") ? 10000 : undefined} defaultValue={preference?.[key] ?? ""} readOnly={key.endsWith("length") ? !isText : !isNumber} />
      </div>)}
    </div>
    <p className={styles.note}>{t("settings.fields.baseline")} <code>{JSON.stringify(field.rules)}</code></p>
    <div className={styles.actions}>
      <ActionSubmitButton idleLabel={t("settings.fields.save")} pendingLabel={t("settings.fields.saving")} />
      <ActionSubmitButton variant="outline" name="reset" value="true" formNoValidate idleLabel={t("settings.fields.reset")} pendingLabel={t("settings.fields.saving")} />
    </div>
    <p role={state.status === "error" || clientError ? "alert" : "status"}>{clientError || state.status === "error" ? t("settings.fields.error") : state.status === "saved" ? t("settings.fields.saved") : ""}</p>
  </form>
}

export function FieldConfigurator({ settings }: { settings: FieldSettings }) {
  const t = useI18n()
  const [search, setSearch] = useState("")
  const [table, setTable] = useState("")
  const fields = settings.catalog.filter(field => (!table || field.table === table) && `${field.key} ${t(`settings.fields.names.${field.name}` as Parameters<typeof t>[0])} ${settings.preferences[field.key]?.label ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  return <section className={styles.section}>
    <h2>{t("settings.fields.title")}</h2>
    <p className={styles.note}>{t("settings.fields.personal")}</p>
    <div className={styles.filters}>
      <div><Label htmlFor="field-search">{t("settings.fields.search")}</Label><Input id="field-search" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div><Label htmlFor="field-table">{t("settings.fields.table")}</Label><select id="field-table" className={selectInputClassName} value={table} onChange={event => setTable(event.target.value)}><option value="">{t("settings.fields.allTables")}</option>{Array.from(new Set(settings.catalog.map(f => f.table))).map(name => <option key={name}>{name}</option>)}</select></div>
    </div>
    <Panel className={styles.catalog}><Table>
      <TableHeader><TableRow>{(["uiName", "databaseName", "type", "validation", "visibility", "actions"] as const).map(key => <TableHead key={key}>{t(`settings.fields.${key}`)}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{fields.map(field => {
        const preference = settings.preferences[field.key]
        const label = t(`settings.fields.names.${field.name}` as Parameters<typeof t>[0])
        return <TableRow key={field.key}>
          <TableCell>{preference?.label || label}</TableCell><TableCell><code>{field.key}</code></TableCell><TableCell>{field.type}</TableCell>
          <TableCell><code className={styles.validation}>{JSON.stringify({ ...field.rules, ...Object.fromEntries(Object.entries(preference ?? {}).filter(([key, value]) => !["label", "visible"].includes(key) && value !== null && value !== false)) })}</code></TableCell>
          <TableCell>{preference?.visible === false ? t("settings.fields.hidden") : t("settings.fields.visible")}</TableCell>
          <TableCell><Dialog><DialogTrigger asChild><Button variant="outline" size="sm" aria-label={`${t("settings.fields.edit")} ${preference?.label || label}`}>{t("settings.fields.edit")}</Button></DialogTrigger><DialogContent width="min(92vw, 36rem)"><DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader><FieldEditor field={field} settings={settings} label={label} /></DialogContent></Dialog></TableCell>
        </TableRow>
      })}</TableBody>
    </Table>{!fields.length && <p className={styles.note}>{t("settings.fields.empty")}</p>}</Panel>
  </section>
}
