import { Skeleton } from "@astryxdesign/core/Skeleton"

import { getI18n } from "@/locales/server"
import patterns from "@/styles/ui-patterns.module.css"
import styles from "./manual-debt-input.module.css"

export default async function ManualDebtInputLoading() {
  const t = await getI18n()

  return (
    <div aria-busy="true" className={patterns.pageStack} role="status">
      <span className={patterns.srOnly}>{t("manualDebts.table.loading")}</span>
      <div className={styles.tableColumn}>
        <div className={styles.tablePanel}>
          <div className={styles.loadingTable}>
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton height={40} index={index} key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
