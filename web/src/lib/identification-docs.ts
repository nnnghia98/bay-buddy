import { z } from "zod"
import type { IdentificationResult } from "@/schemas/identification"

export type IdentificationDocumentType = "identity_card" | "passport"
export const defaultCitizenIdExpiryDate = "2050-12-31"

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

function formatDate(value: string | null): string | null {
  if (!z.iso.date().safeParse(value).success || !value) return null
  const [year, month, day] = value.split("-")
  return `${day}${months[Number(month) - 1]}${year.slice(-2)}`
}

function formatName(value: string | null): string | null {
  const name = value?.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D").toUpperCase().trim().replace(/\s+/g, " ")
  return name && /^[A-Z]+(?: [A-Z]+)*$/.test(name) ? name : null
}

export function buildIdentificationDocs(
  documentType: IdentificationDocumentType,
  result: Pick<IdentificationResult, "document_number" | "date_of_birth" | "sex" | "expiry_date" | "last_name" | "first_name">,
): string | null {
  const number = result.document_number?.trim().toUpperCase()
  const dob = formatDate(result.date_of_birth)
  const expiry = formatDate(result.expiry_date ?? (documentType === "identity_card" ? defaultCitizenIdExpiryDate : null))
  const lastName = formatName(result.last_name)
  const firstName = formatName(result.first_name)
  const genders = result.sex?.split("/").map(value => {
    const sex = value.trim().toUpperCase()
    return ["M", "MALE", "NAM"].includes(sex) ? "M"
      : ["F", "FEMALE", "NỮ", "NU"].includes(sex) ? "F" : null
  }) ?? []
  const gender = genders.length && genders[0] && genders.every(value => value === genders[0])
    ? genders[0] : null
  const validNumber = number && (documentType === "identity_card" ? /^\d{12}$/.test(number) : /^[A-Z0-9]+$/.test(number))
  if (!validNumber || !dob || !expiry || !lastName || !firstName || !gender) return null
  return `SR DOCS-${documentType === "identity_card" ? "I" : "P"}-VN-${number}-VN-${dob}-${gender}-${expiry}-${lastName}/${firstName}`
}
