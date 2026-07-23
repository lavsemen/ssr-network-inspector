import type { H3Event } from 'h3'
import { setResponseHeader } from 'h3'
import * as h3 from 'h3'

export interface CompatibleEventStream {
  push: (data: string) => Promise<void> | void
  onClosed: (cb: () => void | Promise<void>) => void
  send: () => unknown
}

/**
 * Prefer h3 createEventStream when available (h3 >= ~1.11).
 * Fallback keeps Nuxt 3.10 / h3 1.10 working via the Node response stream.
 */
export function createCompatibleEventStream(event: H3Event): CompatibleEventStream {
  const factory = (h3 as Record<string, unknown>).createEventStream as
    | ((event: H3Event) => CompatibleEventStream)
    | undefined

  if (typeof factory === 'function') {
    return factory(event)
  }

  return createLegacyEventStream(event)
}

function createLegacyEventStream(event: H3Event): CompatibleEventStream {
  const res = event.node.res
  const req = event.node.req
  let closed = false
  const closeHandlers: Array<() => void | Promise<void>> = []

  setResponseHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setResponseHeader(event, 'Connection', 'keep-alive')
  setResponseHeader(event, 'X-Accel-Buffering', 'no')

  const markClosed = () => {
    if (closed) {
      return
    }
    closed = true
    for (const handler of closeHandlers) {
      void handler()
    }
    if (!res.writableEnded) {
      res.end()
    }
  }

  req.on('close', markClosed)

  return {
    async push(data: string) {
      if (closed || res.writableEnded) {
        return
      }
      // Sanitize newlines to avoid SSE injection / framing breaks.
      const safe = data.replace(/\r?\n/g, '\\n')
      res.write(`data: ${safe}\n\n`)
    },
    onClosed(cb) {
      closeHandlers.push(cb)
    },
    send() {
      return new Promise<void>((resolve) => {
        if (closed) {
          resolve()
          return
        }
        req.once('close', () => resolve())
      })
    },
  }
}
