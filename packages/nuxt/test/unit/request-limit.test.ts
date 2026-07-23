import { describe, expect, it, vi } from 'vitest'
import { InspectorSessionStore } from '../../src/runtime/server/services/session-store'
import type { SsrInspectorContext } from '../../src/runtime/types/module'

describe('request limit warning', () => {
  it('publishes REQUEST_LIMIT_REACHED only once', () => {
    const store = new InspectorSessionStore()
    const session = store.createSession({
      clientId: 'c',
      pageOrigin: 'http://localhost:3000',
      ttlMs: 60_000,
    })

    const subscriber = vi.fn()
    store.subscribe(session.id, subscriber)

    const context: SsrInspectorContext = {
      sessionId: session.id,
      traceId: 'trace',
      startedAt: Date.now(),
      requestCount: 200,
      limitWarningSent: false,
      finished: false,
      requestDurations: new Map(),
      successfulRequests: 0,
      failedRequests: 0,
      slowestDurationMs: -1,
    }

    const maybeWarn = () => {
      if (context.requestCount >= 200 && !context.limitWarningSent) {
        context.limitWarningSent = true
        store.publish(session.id, {
          type: 'inspector.warning',
          sessionId: session.id,
          traceId: context.traceId,
          timestamp: Date.now(),
          code: 'REQUEST_LIMIT_REACHED',
          message: 'Request limit of 200 reached for this SSR trace',
        })
      }
    }

    maybeWarn()
    maybeWarn()

    const warnings = subscriber.mock.calls
      .map((call) => call[0])
      .filter((event) => event.type === 'inspector.warning')

    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.code).toBe('REQUEST_LIMIT_REACHED')
  })
})
