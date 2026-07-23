import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup, url } from '@nuxt/test-utils/e2e'
import type { CreateSessionResponse, InspectorEvent } from '@ssr-network-inspector/protocol'
import { isInspectorEvent } from '@ssr-network-inspector/protocol'

await setup({
  rootDir: fileURLToPath(new URL('../fixtures/basic', import.meta.url)),
  server: true,
  browser: false,
})

async function createSession(): Promise<CreateSessionResponse> {
  return $fetch('/__ssr-network-inspector/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer dev-secret',
    },
    body: {
      clientId: 'test-client',
      pageOrigin: 'http://localhost:3000',
    },
  })
}

async function openEventStream(session: CreateSessionResponse): Promise<{
  events: InspectorEvent[]
  waitUntil: (predicate: (events: InspectorEvent[]) => boolean, timeoutMs?: number) => Promise<InspectorEvent[]>
  close: () => void
}> {
  const events: InspectorEvent[] = []
  const controller = new AbortController()

  const response = await fetch(url(session.eventsUrl), {
    headers: {
      Authorization: `Bearer ${session.sessionToken}`,
      Accept: 'text/event-stream',
    },
    signal: controller.signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`SSE failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let reading = true

  const pump = (async () => {
    while (reading) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() ?? ''
      for (const chunk of chunks) {
        const dataLines = chunk
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
        if (dataLines.length === 0) continue
        try {
          const parsed: unknown = JSON.parse(dataLines.join('\n'))
          if (isInspectorEvent(parsed)) {
            events.push(parsed)
          }
        }
        catch {
          // ignore
        }
      }
    }
  })()

  return {
    events,
    async waitUntil(predicate, timeoutMs = 20_000) {
      const started = Date.now()
      while (Date.now() - started < timeoutMs) {
        if (predicate(events)) {
          return events
        }
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      throw new Error(`Timed out waiting for events. Got: ${events.map((event) => event.type).join(', ')}`)
    },
    close() {
      reading = false
      controller.abort()
      void pump.catch(() => undefined)
    },
  }
}

describe('ssr network inspector module', () => {
  it('exposes health endpoint without secrets', async () => {
    const health = await $fetch<{ enabled: boolean, version: string }>('/__ssr-network-inspector/health')
    expect(health.enabled).toBe(true)
    expect(health.version).toBe('0.1.0')
    expect(JSON.stringify(health)).not.toContain('dev-secret')
  })

  it('rejects unauthorized session creation', async () => {
    await expect(
      $fetch('/__ssr-network-inspector/sessions', {
        method: 'POST',
        body: {
          clientId: 'x',
          pageOrigin: 'http://localhost:3000',
        },
      }),
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('creates authorized sessions', async () => {
    const session = await createSession()
    expect(session.sessionId).toBeTruthy()
    expect(session.sessionToken).toBeTruthy()
    expect(session.eventsUrl).toContain(session.sessionId)
  })

  it('does not activate inspector without headers', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('Fixture')
  })

  it('publishes trace and request events with valid headers', async () => {
    const session = await createSession()
    const stream = await openEventStream(session)

    try {
      await stream.waitUntil((events) => events.some((event) => event.type === 'inspector.ready'))

      await $fetch('/', {
        headers: {
          'x-ssr-inspector-session': session.sessionId,
          'x-ssr-inspector-token': session.sessionToken,
        },
      })

      const events = await stream.waitUntil(
        (items) =>
          items.some((event) => event.type === 'trace.started')
          && items.some((event) => event.type === 'request.started')
          && items.some((event) => event.type === 'request.finished')
          && items.some((event) => event.type === 'trace.finished'),
      )

      const types = events.map((event) => event.type)
      expect(types).toContain('inspector.ready')
      expect(types).toContain('trace.started')
      expect(types).toContain('request.started')
      expect(types).toContain('request.finished')
      expect(types).toContain('trace.finished')

      const started = events.find((event) => event.type === 'request.started')
      if (started?.type === 'request.started') {
        expect(started.request.transport).toBe('nitro-local')
        expect(started.request.pathname).toBe('/api/demo')
        expect(JSON.stringify(started.request.headers ?? {})).not.toContain('dev-secret')
      }
    }
    finally {
      stream.close()
    }
  }, 60_000)
})
