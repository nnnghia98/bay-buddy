const vndCurrencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
})

export function formatCurrency(amount: number): string {
  return vndCurrencyFormatter.format(amount)
}

export function formatSignedCurrency(amount: number): string {
  if (amount === 0) {
    return formatCurrency(amount)
  }

  const sign = amount > 0 ? "+" : "-"
  return `${sign}${formatCurrency(Math.abs(amount))}`
}

export function parseCurrencyInput(value: string): number {
  const digitsOnly = value.replace(/[^\d]/g, "")
  return digitsOnly ? Number(digitsOnly) : 0
}

export function formatCurrencyInput(value: number | string): string {
  const parsedValue =
    typeof value === "number" ? value : parseCurrencyInput(value)

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(parsedValue) ? parsedValue : 0)
}
