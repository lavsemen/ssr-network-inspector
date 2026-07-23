import { isInspectorEvent, type InspectorEvent } from '@ssr-network-inspector/protocol'

export interface SseParseResult {
  events: InspectorEvent[]
  warnings: string[]
  rest: string
}

export function parseSseChunk(buffer: string, chunk: string): SseParseResult {
  const combined = buffer + chunk
  const parts = combined.split('\n\n')
  const rest = parts.pop() ?? ''
  const events: InspectorEvent[] = []
  const warnings: string[] = []

  for (const part of parts) {
    const lines = part.split(/\r?\n/)
    const dataLines: string[] = []

    for (const line of lines) {
      if (!line || line.startsWith(':')) {
        continue
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      }
    }

    if (dataLines.length === 0) {
      continue
    }

    const payload = dataLines.join('\n')
    try {
      const parsed: unknown = JSON.parse(payload)
      if (isInspectorEvent(parsed)) {
        events.push(parsed)
      }
      else {
        warnings.push('Received event failed type guard validation')
      }
    }
    catch {
      warnings.push('Malformed SSE JSON payload')
    }
  }

  return { events, warnings, rest }
}

export async function* readSseStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<{ events: InspectorEvent[], warnings: string[] }> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      const parsed = parseSseChunk(buffer, decoder.decode(value, { stream: true }))
      buffer = parsed.rest
      if (parsed.events.length > 0 || parsed.warnings.length > 0) {
        yield {
          events: parsed.events,
          warnings: parsed.warnings,
        }
      }
    }
  }
  finally {
    reader.releaseLock()
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError')
    || (error instanceof Error && error.name === 'AbortError')
  )
}
