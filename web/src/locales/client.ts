import { createI18nClient } from "next-international/client"

import vi from "./vi"

export const { I18nProviderClient, useI18n } = createI18nClient(
  {
    vi: () => import("./vi"),
    en: () => import("./en"),
  },
  {
    fallbackLocale: vi,
  },
)
