import { getI18n } from "@/locales/server"
import patterns from "@/styles/ui-patterns.module.css"
import styles from "./session-state.module.css"

export default async function WorkbookSessionLoading() {
  const t = await getI18n()

  return (
    <div aria-busy="true" className={styles.page} role="status">
      <span className={patterns.srOnly}>{t("workbookEditor.editor.loading")}</span>
      <div className={styles.skeleton}>
        <div className={styles.skeletonBar} />
        <div className={styles.skeletonToolbar} />
        <div className={styles.skeletonRows}>
          {Array.from({ length: 8 }, (_, index) => (
            <div className={styles.skeletonRow} key={index} />
          ))}
        </div>
        <div className={styles.skeletonFooter} />
      </div>
    </div>
  )
}
