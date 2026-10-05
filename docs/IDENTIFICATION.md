# Transient identification reading

- Page: `/identification`. Authenticated endpoint: `POST /api/v1/ai/identification`.
- Upload one or two JPEG, PNG, WebP or PDF files of one person's ID card or
  passport (front/back); combined maximum 10 MB.
- No record creation, database writes, saved extraction history, browser storage,
  provider Files API uploads, or application logging of document content.
  Authentication reads the existing user record. Multipart upload buffers are
  closed after the request. Results remain in page memory until cleared or left.
- Bytes are sent to Google Gemini. Provider retention is governed by the account
  and service terms; no database storage in Bay Buddy does not mean local-only
  processing or zero provider retention.
- Default: `gemini-3.1-flash-lite`, configurable independently through
  `IDENTIFICATION_GEMINI_MODEL`. Uses existing `GEMINI_API_KEY`.
- Values are suggestions for staff to compare with the source. Null means absent
  or unclear. Names keep Vietnamese accents; numbers keep leading zeros; dates
  are validated as ISO dates and shown as DD/MM/YYYY. No authenticity assessment
  or face matching.

## Model choice (checked 4 October 2026)

Gemini supports image/PDF input and schema-constrained JSON, with no separate
OCR service needed: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite

Jev currently accepts text only. Its extraction cookbook selects values from
candidates that code finds first. It would need an OCR stage before reading ID
photos. Avoid adding this extra service for the initial page. Jev may be useful
later for narrow decisions over extracted text, after measured evaluation:
https://docs.typesafe.ai/concepts/state
https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook

## SR DOCS output

Staff selects CCCD (`identity_card`) or Passport (`passport`) before extraction.
The API requires `document_type` in the multipart form and rejects a mismatch.
The page builds this line from the reviewed values; the model does not format it:

`SR DOCS-[I or P]-VN-[number]-VN-[DDMMMYY DOB]-[M or F]-[DDMMMYY expiry]-[surname]/[all given names]`

- Country codes are fixed to `VN`, as requested for this workflow.
- CCCD uses `I` and requires 12 digits; Passport uses `P` and an alphanumeric number.
- Months use English JAN–DEC codes. Citizen IDs without an expiry date use
  `2050-12-31` in the editable form and script. Other missing dates are not
  inferred, and passports still require an expiry date.
- The Script section accepts matching bilingual sex values such as `NỮ / F`
  and `NAM / M`. Unknown or conflicting values still disable copying.
- Names use uppercase Latin letters without Vietnamese accents; `Đ` becomes `D`.
- For CCCD, the first word is the surname; remaining words include middle and
  given names. Staff must review compound surnames. For passports, use the
  explicit surname and given-name fields; leave unclear splits blank.
- Staff can correct required values in page memory. Missing or invalid values
  disable copying. No trailing slash or backslash is added after the given names.
