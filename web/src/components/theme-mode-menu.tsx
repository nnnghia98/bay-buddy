"use client"

import {
  DropdownMenu,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@astryxdesign/core/DropdownMenu"
import { Monitor, Moon, Sun } from "lucide-react"

import { isThemeMode, type ThemeMode } from "@/lib/theme-mode"
import { useThemeMode } from "@/lib/theme-mode-context"
import { useI18n } from "@/locales/client"

const themeModeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} satisfies Record<ThemeMode, typeof Sun>

export function ThemeModeRadioGroup() {
  const t = useI18n()
  const { mode, setMode } = useThemeMode()

  const handleChange = (value: string) => {
    if (isThemeMode(value)) {
      setMode(value)
    }
  }

  return (
    <DropdownMenuRadioGroup
      aria-label={t("appShell.theme.label")}
      onChange={handleChange}
      value={mode}
    >
      <DropdownMenuRadioItem
        description={t("appShell.theme.lightDescription")}
        icon={<Sun aria-hidden="true" size={16} strokeWidth={2} />}
        label={t("appShell.theme.light")}
        value="light"
      />
      <DropdownMenuRadioItem
        description={t("appShell.theme.darkDescription")}
        icon={<Moon aria-hidden="true" size={16} strokeWidth={2} />}
        label={t("appShell.theme.dark")}
        value="dark"
      />
      <DropdownMenuRadioItem
        description={t("appShell.theme.systemDescription")}
        icon={<Monitor aria-hidden="true" size={16} strokeWidth={2} />}
        label={t("appShell.theme.system")}
        value="system"
      />
    </DropdownMenuRadioGroup>
  )
}

export function ThemeModeMenu() {
  const t = useI18n()
  const { mode } = useThemeMode()
  const ActiveIcon = themeModeIcons[mode]
  const label = t("appShell.theme.select")

  return (
    <DropdownMenu
      button={{
        icon: (
          <ActiveIcon aria-hidden="true" size={18} strokeWidth={2} />
        ),
        isIconOnly: true,
        label,
        size: "md",
        tooltip: label,
        variant: "ghost",
      }}
      hasChevron={false}
      menuWidth={244}
      placement="below"
    >
      <ThemeModeRadioGroup />
    </DropdownMenu>
  )
}
