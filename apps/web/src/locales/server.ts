import {
  createI18nServer,
  setStaticParamsLocale,
} from "next-international/server"

import vi from "./vi"

const serverI18n = createI18nServer(
  {
    vi: () => import("./vi"),
    en: () => import("./en"),
  },
  {
    fallbackLocale: vi,
  },
)

export function getI18n() {
  setStaticParamsLocale("vi")
  return serverI18n.getI18n()
}

export function getScopedI18n<Scope extends Parameters<typeof serverI18n.getScopedI18n>[0]>(
  scope: Scope,
) {
  setStaticParamsLocale("vi")
  return serverI18n.getScopedI18n(scope)
}
