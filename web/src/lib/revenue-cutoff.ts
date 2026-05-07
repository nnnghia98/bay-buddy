const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh"
const VIETNAM_UTC_OFFSET = "+07:00"

function getMonthStartDateInVietnam(reference: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  })
  const parts = formatter.formatToParts(reference)
  const year = parts.find((part) => part.type === "year")?.value ?? "1970"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"

  return new Date(`${year}-${month}-01T00:00:00${VIETNAM_UTC_OFFSET}`)
}

export function parseRevenueFromParam(
  value?: string,
  referenceDate: Date = new Date(),
): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getMonthStartDateInVietnam(referenceDate)
  }

  const parsedDate = new Date(`${value}T00:00:00${VIETNAM_UTC_OFFSET}`)

  if (Number.isNaN(parsedDate.getTime())) {
    return getMonthStartDateInVietnam(referenceDate)
  }

  return parsedDate
}
