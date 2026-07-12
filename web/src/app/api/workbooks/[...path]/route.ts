import { buildApiUrl, getServerApiBaseUrl } from "@/lib/api-base"

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "idempotency-key",
] as const

const FORWARDED_RESPONSE_HEADERS = [
  "content-disposition",
  "content-length",
  "content-type",
  "etag",
  "x-workbook-version",
] as const

type RouteContext = {
  params: Promise<{ path: string[] }>
}

async function proxyWorkbookRequest(request: Request, context: RouteContext) {
  const { path } = await context.params
  const upstreamUrl = new URL(
    buildApiUrl(`/workbooks/${path.map(encodeURIComponent).join("/")}`, getServerApiBaseUrl()),
  )
  upstreamUrl.search = new URL(request.url).search

  const headers = new Headers()
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD"
  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    })
  } catch {
    return Response.json(
      {
        detail: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "Workbook service is unavailable.",
          details: {},
        },
      },
      { status: 502 },
    )
  }

  const responseHeaders = new Headers()
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

export const dynamic = "force-dynamic"

export const GET = proxyWorkbookRequest
export const POST = proxyWorkbookRequest
export const PATCH = proxyWorkbookRequest
