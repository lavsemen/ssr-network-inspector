import type { RequestErrorInfo } from '@lavsemen/ssr-network-inspector-protocol'

const REDACTED = '[REDACTED]'

export function sanitizeHeaders(
  headers: Record<string, string> | Headers | undefined,
  redactHeaders: string[],
): Record<string, string> | undefined {
  if (!headers) {
    return undefined
  }

  const redactSet = new Set(redactHeaders.map((name) => name.toLowerCase()))
  const result: Record<string, string> = {}

  const entries
    = headers instanceof Headers
      ? Array.from(headers.entries())
      : Object.entries(headers)

  for (const [key, value] of entries) {
    result[key] = redactSet.has(key.toLowerCase()) ? REDACTED : String(value)
  }

  return result
}

export function sanitizeQuery(
  query: Record<string, string | string[]> | undefined,
  redactQueryParams: string[],
): Record<string, string | string[]> | undefined {
  if (!query) {
    return undefined
  }

  const redactSet = new Set(redactQueryParams.map((name) => name.toLowerCase()))
  const result: Record<string, string | string[]> = {}

  for (const [key, value] of Object.entries(query)) {
    if (redactSet.has(key.toLowerCase())) {
      result[key] = Array.isArray(value) ? value.map(() => REDACTED) : REDACTED
    }
    else {
      result[key] = value
    }
  }

  return result
}

export function sanitizeUrl(url: string, redactQueryParams: string[]): string {
  try {
    const parsed = new URL(url, 'http://localhost')
    const redactSet = new Set(redactQueryParams.map((name) => name.toLowerCase()))

    for (const key of Array.from(parsed.searchParams.keys())) {
      if (redactSet.has(key.toLowerCase())) {
        parsed.searchParams.set(key, REDACTED)
      }
    }

    if (url.startsWith('/') || !/^https?:\/\//i.test(url)) {
      return `${parsed.pathname}${parsed.search}`
    }

    return parsed.toString()
  }
  catch {
    return url
  }
}

export interface BodyPreviewResult {
  preview?: string
  truncated: boolean
  unsupported: boolean
}

function safeStringify(value: unknown, maxBytes: number): BodyPreviewResult {
  const seen = new WeakSet<object>()

  try {
    const json = JSON.stringify(value, (_key, current) => {
      if (typeof current === 'object' && current !== null) {
        if (seen.has(current)) {
          return '[Circular]'
        }
        seen.add(current)
      }
      return current
    })

    if (json === undefined) {
      return { preview: undefined, truncated: false, unsupported: true }
    }

    const encoded = new TextEncoder().encode(json)
    if (encoded.byteLength > maxBytes) {
      const truncated = new TextDecoder().decode(encoded.slice(0, maxBytes))
      return { preview: truncated, truncated: true, unsupported: false }
    }

    return { preview: json, truncated: false, unsupported: false }
  }
  catch {
    return { preview: undefined, truncated: false, unsupported: true }
  }
}

export function createBodyPreview(
  body: unknown,
  maxBodyBytes: number,
): BodyPreviewResult {
  if (body === undefined || body === null) {
    return { preview: undefined, truncated: false, unsupported: false }
  }

  if (typeof body === 'string') {
    const encoded = new TextEncoder().encode(body)
    if (encoded.byteLength > maxBodyBytes) {
      return {
        preview: new TextDecoder().decode(encoded.slice(0, maxBodyBytes)),
        truncated: true,
        unsupported: false,
      }
    }
    return { preview: body, truncated: false, unsupported: false }
  }

  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return { preview: '[Binary body]', truncated: false, unsupported: true }
  }

  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) {
    return { preview: '[Binary body]', truncated: false, unsupported: true }
  }

  if (ArrayBuffer.isView(body)) {
    return { preview: '[Binary body]', truncated: false, unsupported: true }
  }

  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    return { preview: '[Streaming body]', truncated: false, unsupported: true }
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return { preview: '[Unsupported body]', truncated: false, unsupported: true }
  }

  if (typeof body === 'object' || typeof body === 'number' || typeof body === 'boolean') {
    return safeStringify(body, maxBodyBytes)
  }

  return { preview: '[Unsupported body]', truncated: false, unsupported: true }
}

export function getBodySize(body: unknown, contentLength?: string | null): number | undefined {
  if (contentLength) {
    const parsed = Number.parseInt(contentLength, 10)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  if (typeof body === 'string') {
    return new TextEncoder().encode(body).byteLength
  }

  if (body && typeof body === 'object' && !(body instanceof Blob) && !(body instanceof ReadableStream)) {
    try {
      return new TextEncoder().encode(JSON.stringify(body)).byteLength
    }
    catch {
      return undefined
    }
  }

  return undefined
}

export function serializeError(error: unknown): RequestErrorInfo {
  if (error && typeof error === 'object') {
    const record = error as {
      name?: unknown
      message?: unknown
      code?: unknown
      status?: unknown
      statusCode?: unknown
      data?: { statusCode?: unknown }
      response?: { status?: unknown }
      cause?: { code?: unknown }
    }

    const status
      = typeof record.status === 'number'
        ? record.status
        : typeof record.statusCode === 'number'
          ? record.statusCode
          : typeof record.response?.status === 'number'
            ? record.response.status
            : typeof record.data?.statusCode === 'number'
              ? record.data.statusCode
              : undefined

    const code
      = typeof record.code === 'string'
        ? record.code
        : typeof record.cause?.code === 'string'
          ? record.cause.code
          : undefined

    return {
      name: typeof record.name === 'string' ? record.name : 'Error',
      message: typeof record.message === 'string' ? record.message : 'Unknown error',
      ...(code ? { code } : {}),
      ...(status !== undefined ? { status } : {}),
    }
  }

  return {
    name: 'Error',
    message: String(error),
  }
}
