import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { pathToFileURL } from "node:url"
import openapiTS, { astToString } from "openapi-typescript"

const schemaInput =
  process.env.OPENAPI_SCHEMA_URL ?? "http://localhost:6768/openapi.json"
const outputPath = path.resolve("src/lib/api/generated.ts")
const schemaUrl = /^https?:\/\//.test(schemaInput)
  ? schemaInput
  : pathToFileURL(path.resolve(schemaInput)).href

const ast = await openapiTS(schemaUrl, {
  alphabetize: true,
})
const output = astToString(ast)

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, output, "utf8")

console.log(`Generated API client types from ${schemaUrl}`)
console.log(`Wrote ${outputPath}`)
