const DIGIT_WORDS = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
] as const

const BLOCK_UNITS = [
  "",
  "nghìn",
  "triệu",
  "tỷ",
  "nghìn tỷ",
  "triệu tỷ",
] as const

function normalizeWholeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Value must be a finite number.")
  }

  return Math.round(Math.abs(value))
}

function readThreeDigits(block: number, isFullBlock: boolean): string {
  const hundreds = Math.floor(block / 100)
  const tens = Math.floor((block % 100) / 10)
  const ones = block % 10
  const words: string[] = []

  if (hundreds > 0 || isFullBlock) {
    if (hundreds > 0) {
      words.push(`${DIGIT_WORDS[hundreds]} trăm`)
    } else if (tens > 0 || ones > 0) {
      words.push("không trăm")
    }
  }

  if (tens > 1) {
    words.push(`${DIGIT_WORDS[tens]} mươi`)
    if (ones === 1) {
      words.push("mốt")
    } else if (ones === 4) {
      words.push("tư")
    } else if (ones === 5) {
      words.push("lăm")
    } else if (ones > 0) {
      words.push(DIGIT_WORDS[ones])
    }
    return words.join(" ").trim()
  }

  if (tens === 1) {
    words.push("mười")
    if (ones === 5) {
      words.push("lăm")
    } else if (ones > 0) {
      words.push(DIGIT_WORDS[ones])
    }
    return words.join(" ").trim()
  }

  if (ones > 0) {
    if (hundreds > 0 || isFullBlock) {
      words.push("lẻ")
    }
    words.push(DIGIT_WORDS[ones])
  }

  return words.join(" ").trim()
}

export function convertNumberToVietnameseWords(value: number): string {
  const normalizedValue = normalizeWholeNumber(value)

  if (normalizedValue === 0) {
    return "Không đồng"
  }

  const blocks: number[] = []
  let remainingValue = normalizedValue

  while (remainingValue > 0) {
    blocks.push(remainingValue % 1000)
    remainingValue = Math.floor(remainingValue / 1000)
  }

  const parts: string[] = []

  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index]
    if (block === 0) {
      continue
    }

    const hasHigherBlock = index < blocks.length - 1
    const blockWords = readThreeDigits(block, hasHigherBlock && block < 100)
    const unit = BLOCK_UNITS[index]

    parts.push(unit ? `${blockWords} ${unit}` : blockWords)
  }

  const sentence = `${parts.join(" ").replace(/\s+/g, " ").trim()} đồng`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

export const convert_number_to_vn_words = convertNumberToVietnameseWords
