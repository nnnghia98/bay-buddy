import { describe, expect, it } from "vitest"
import { buildIdentificationDocs } from "./identification-docs"

const sample = {
  document_number: "001172043965",
  date_of_birth: "1972-11-22",
  sex: "Nữ",
  expiry_date: "2050-11-22",
  last_name: "Trần",
  first_name: "Thị Hoài Hương",
}

describe("SR-DOCS output", () => {
  it("matches the CCCD example, retaining zeros and removing name accents", () => {
    expect(buildIdentificationDocs("identity_card", sample)).toBe(
      "SR-DOCS-I-VN-001172043965-VN-22NOV72-F-22NOV50-TRAN/THI HOAI HUONG",
    )
  })
  it("uses P for passports, English months, M for male, and all given names", () => {
    expect(buildIdentificationDocs("passport", {
      ...sample, document_number: "b0123456", date_of_birth: "1998-01-22",
      expiry_date: "2030-12-01", sex: "Nam", last_name: "Đặng", first_name: "Văn An",
    })).toBe("SR-DOCS-P-VN-B0123456-VN-22JAN98-M-01DEC30-DANG/VAN AN")
  })
  it.each(["NỮ / F", "Female / F", "F / Nữ"])("builds a passport script with bilingual sex: %s", sex => {
    expect(buildIdentificationDocs("passport", {
      ...sample, document_number: "B0123456", sex,
    })).toBe("SR-DOCS-P-VN-B0123456-VN-22NOV72-F-22NOV50-TRAN/THI HOAI HUONG")
  })
  it.each([
    { expiry_date: "2050-02-30" }, { date_of_birth: "1998-02-30" }, { sex: null },
    { sex: "unknown" }, { sex: "M / F" }, { sex: "unknown / F" }, { last_name: null }, { first_name: null },
    { first_name: "AN/TEST" }, { document_number: "123" },
  ])("does not produce a copyable line for missing or invalid required data: %j", change => {
    expect(buildIdentificationDocs("identity_card", { ...sample, ...change })).toBeNull()
  })
  it("uses 31 December 2050 for a citizen ID without an expiry date", () => {
    expect(buildIdentificationDocs("identity_card", { ...sample, expiry_date: null })).toBe(
      "SR-DOCS-I-VN-001172043965-VN-22NOV72-F-31DEC50-TRAN/THI HOAI HUONG",
    )
  })
  it("requires an expiry date for passports", () => {
    expect(buildIdentificationDocs("passport", { ...sample, expiry_date: null })).toBeNull()
  })
})
