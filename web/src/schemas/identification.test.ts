import { describe, expect, it } from "vitest"
import { identificationUploadSchema } from "./identification"

describe("identification upload", () => {
  const image = () => new File(["image"], "front.png", { type: "image/png" })

  it("accepts front and back images", () => {
    expect(identificationUploadSchema.safeParse([image(), image()]).success).toBe(true)
  })

  it("rejects unsupported files, empty files, and more than two files", () => {
    for (const files of [[], [new File(["text"], "test.txt", { type: "text/plain" })], [new File([], "empty.png", { type: "image/png" })], [image(), image(), image()]]) {
      expect(identificationUploadSchema.safeParse(files).success).toBe(false)
    }
  })

  it("keeps the accepted stack when a third paste exceeds the limit", () => {
    let files = [image()]
    const secondPaste = [...files, image()]
    if (identificationUploadSchema.safeParse(secondPaste).success) files = secondPaste
    const thirdPaste = [...files, image()]
    if (identificationUploadSchema.safeParse(thirdPaste).success) files = thirdPaste
    expect(files).toEqual(secondPaste)
    expect(files).toHaveLength(2)
  })

  it("enforces the combined size limit", () => {
    const large = new File([new Uint8Array(10 * 1024 * 1024)], "large.pdf", { type: "application/pdf" })
    expect(identificationUploadSchema.safeParse([large]).success).toBe(true)
    expect(identificationUploadSchema.safeParse([large, image()]).success).toBe(false)
  })
})
