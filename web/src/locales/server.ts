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

const defaultLocaleContent = vi as Record<string, unknown>

export function getActionI18n() {
  return (key: string): string => {
    const value = key
      .split(".")
      .reduce<unknown>(
        (current, segment) =>
          current && typeof current === "object"
            ? (current as Record<string, unknown>)[segment]
            : undefined,
        defaultLocaleContent,
      )

    return typeof value === "string" ? value : key
  }
}

export function getScopedI18n<Scope extends Parameters<typeof serverI18n.getScopedI18n>[0]>(
  scope: Scope,
) {
  setStaticParamsLocale("vi")
  return serverI18n.getScopedI18n(scope)
}
