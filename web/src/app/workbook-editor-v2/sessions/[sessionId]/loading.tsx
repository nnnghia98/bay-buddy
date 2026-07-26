import { getI18n } from "@/locales/server"

export default async function WorkbookSessionLoading() {
  const t = await getI18n()

  return (
    <div aria-busy="true" className="pb-12" role="status">
      <span className="sr-only">{t("workbookEditor.editor.loading")}</span>
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="h-[4.5rem] animate-pulse border-b border-border bg-white motion-reduce:animate-none" />
        <div className="h-14 animate-pulse border-b border-border bg-secondary/55 motion-reduce:animate-none" />
        <div className="space-y-px bg-border">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              className="h-14 animate-pulse bg-white motion-reduce:animate-none"
              key={index}
            />
          ))}
        </div>
        <div className="h-12 animate-pulse border-t border-border bg-secondary/40 motion-reduce:animate-none" />
      </div>
    </div>
  )
}
