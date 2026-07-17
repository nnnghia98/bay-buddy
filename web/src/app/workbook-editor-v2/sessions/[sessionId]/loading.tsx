import { getI18n } from "@/locales/server"

export default async function WorkbookSessionLoading() {
  const t = await getI18n()

  return (
    <div aria-busy="true" className="space-y-4 pb-12" role="status">
      <span className="sr-only">{t("workbookEditor.editor.loading")}</span>
      <div className="h-20 animate-pulse rounded-xl border border-border bg-white" />
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="h-16 animate-pulse border-b border-border bg-secondary/55" />
        <div className="space-y-px bg-border">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="h-14 animate-pulse bg-white" key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
