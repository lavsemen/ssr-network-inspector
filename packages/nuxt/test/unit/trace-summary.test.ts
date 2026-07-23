import { describe, expect, it } from 'vitest'
import {
  buildTraceSummary,
  recordRequestDuration,
} from '../../src/runtime/server/services/trace-summary'
import type { SsrInspectorContext } from '../../src/runtime/types/module'

function createContext(): SsrInspectorContext {
  return {
    sessionId: 'sess',
    traceId: 'trace',
    startedAt: Date.now(),
    requestCount: 0,
    limitWarningSent: false,
    finished: false,
    requestDurations: new Map(),
    successfulRequests: 0,
    failedRequests: 0,
    slowestDurationMs: -1,
  }
}

describe('trace summary', () => {
  it('calculates totals and slowest request', () => {
    const context = createContext()
    context.requestCount = 2
    recordRequestDuration(context, 'a', 10, true)
    recordRequestDuration(context, 'b', 40, false)

    expect(buildTraceSummary(context)).toEqual({
      totalRequests: 2,
      successfulRequests: 1,
      failedRequests: 1,
      totalBackendDurationMs: 50,
      slowestRequestId: 'b',
    })
  })
})
