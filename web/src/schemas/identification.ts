import { z } from "zod"

export const identificationUploadSchema = z.array(z.instanceof(File)
  .refine(file => file.size > 0)
  .refine(file => ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)))
  .min(1).max(2).refine(files => files.reduce((total, file) => total + file.size, 0) <= 10 * 1024 * 1024)

const text = z.string().nullable()
const date = z.iso.date().nullable()
export const identificationResultSchema = z.object({
  document_type: z.enum(["identity_card", "passport", "unknown"]),
  document_number: text,
  full_name: text,
  last_name: text,
  first_name: text,
  date_of_birth: date,
  sex: text,
  nationality: text,
  place_of_birth: text,
  place_of_origin: text,
  address: text,
  issue_date: date,
  expiry_date: date,
  issuing_authority: text,
})
export type IdentificationResult = z.infer<typeof identificationResultSchema>
