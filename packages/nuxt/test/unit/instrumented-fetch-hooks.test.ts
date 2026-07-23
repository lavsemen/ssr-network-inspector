import { describe, expect, it, vi } from 'vitest'
import { createInstrumentedFetch } from '../../src/runtime/server/services/instrumented-fetch'
import { DEFAULT_MODULE_OPTIONS } from '../../src/runtime/shared/defaults'
import { setInspectorContext } from '../../src/runtime/server/utils/context'
import { resetSessionStoreForTests } from '../../src/runtime/server/services/session-store'
import type { H3Event } from 'h3'

describe('createInstrumentedFetch hook merge', () => {
  it('keeps instrumentation when call-site onResponse overwrites create defaults', async () => {
    resetSessionStoreForTests()
    const store = resetSessionStoreForTests()
    const session = store.createSession({
      clientId: 'test',
      pageOrigin: 'http://localhost',
      ttlMs: 60_000,
    })

    const event = {
      context: {},
    } as H3Event

    setInspectorContext(event, {
      sessionId: session.id,
      traceId: 'trace_test',
      startedAt: Date.now(),
      requestCount: 0,
      finished: false,
      limitWarningSent: false,
      requestDurations: new Map(),
      successfulRequests: 0,
      failedRequests: 0,
      slowestDurationMs: 0,
    })

    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    // Patch global fetch used by ofetch
    const previousFetch = globalThis.fetch
    globalThis.fetch = fetchImpl as unknown as typeof fetch

    try {
      const $ssrFetch = createInstrumentedFetch(
        {
          ...DEFAULT_MODULE_OPTIONS,
          enabled: true,
          authToken: 'secret',
          capture: {
            ...DEFAULT_MODULE_OPTIONS.capture,
            responseBodyPreview: true,
          },
        },
        () => event,
      )

      const callSiteOnResponse = vi.fn()

      const data = await $ssrFetch('https://example.com/api/tours', {
        onResponse: callSiteOnResponse,
      })

      expect(data).toEqual({ ok: true })
      expect(callSiteOnResponse).toHaveBeenCalled()

      const types = store.getBacklog(session.id).map((item) => item.type)
      expect(types).toContain('request.started')
      expect(types).toContain('request.finished')

      const finished = store.getBacklog(session.id).find((item) => item.type === 'request.finished')
      expect(finished).toMatchObject({
        type: 'request.finished',
        response: {
          status: 200,
          bodyPreview: expect.stringContaining('"ok":true'),
        },
      })
    }
    finally {
      globalThis.fetch = previousFetch
    }
  })
})
