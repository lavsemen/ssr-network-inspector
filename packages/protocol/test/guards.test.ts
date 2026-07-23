import { describe, expect, it } from 'vitest'
import { isInspectorEvent } from '../src/guards.js'
import type { InspectorEvent } from '../src/events.js'

const validStarted: InspectorEvent = {
  type: 'request.started',
  sessionId: 'session-1',
  traceId: 'trace-1',
  requestId: 'req-1',
  timestamp: Date.now(),
  request: {
    method: 'GET',
    url: 'http://localhost:4001/api/fast',
    pathname: '/api/fast',
    transport: 'http',
  },
}

describe('isInspectorEvent', () => {
  it('accepts a valid event', () => {
    expect(isInspectorEvent(validStarted)).toBe(true)
  })

  it('rejects unknown type', () => {
    expect(
      isInspectorEvent({
        ...validStarted,
        type: 'request.unknown',
      }),
    ).toBe(false)
  })

  it('rejects missing traceId for request events', () => {
    const withoutTrace = {
      type: validStarted.type,
      sessionId: validStarted.sessionId,
      requestId: validStarted.requestId,
      timestamp: validStarted.timestamp,
      request: validStarted.request,
    }
    expect(isInspectorEvent(withoutTrace)).toBe(false)
  })

  it('rejects invalid timestamp', () => {
    expect(
      isInspectorEvent({
        ...validStarted,
        timestamp: 'now',
      }),
    ).toBe(false)
  })

  it('rejects malformed request object', () => {
    expect(
      isInspectorEvent({
        ...validStarted,
        request: {
          method: 'GET',
        },
      }),
    ).toBe(false)
  })
})
