import { Skeleton } from "@astryxdesign/core/Skeleton"

import { getI18n } from "@/locales/server"
import patterns from "@/styles/ui-patterns.module.css"
import styles from "./report.module.css"

export default async function ReportLoading() {
  const t = await getI18n()

  return (
    <div aria-busy="true" className={patterns.pageStack} role="status">
      <span className={patterns.srOnly}>{t("report.filters.applying")}</span>
      <section className={styles.report}>
        <div className={styles.header}>
          <Skeleton height={18} width={180} />
          <Skeleton height={12} width={420} />
          <Skeleton height={38} width={520} />
        </div>
        <div className={styles.loadingTable}>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton height={36} index={index} key={index} />
          ))}
        </div>
      </section>
    </div>
  )
}
