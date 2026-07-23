import { describe, expect, it } from 'vitest'
import {
  applyInspectorEvent,
  createInitialState,
  getFilteredRequests,
} from '../src/panel/stores/inspector-store'
import type { InspectorEvent } from '@ssr-network-inspector/protocol'

function started(): InspectorEvent {
  return {
    type: 'request.started',
    sessionId: 's1',
    traceId: 't1',
    requestId: 'r1',
    timestamp: 1000,
    request: {
      method: 'GET',
      url: 'http://localhost:4001/api/fast',
      pathname: '/api/fast',
      transport: 'http',
    },
  }
}

describe('inspector store', () => {
  it('merges started and finished into one record', () => {
    const state = createInitialState()
    applyInspectorEvent(state, {
      type: 'trace.started',
      sessionId: 's1',
      traceId: 't1',
      timestamp: 900,
      page: { method: 'GET', url: 'http://localhost:3000/', pathname: '/' },
    })
    applyInspectorEvent(state, started())
    applyInspectorEvent(state, {
      type: 'request.finished',
      sessionId: 's1',
      traceId: 't1',
      requestId: 'r1',
      timestamp: 1100,
      response: { status: 200 },
      timing: { startedAt: 1000, finishedAt: 1100, durationMs: 100 },
    })

    expect(Object.keys(state.requests)).toHaveLength(1)
    expect(state.requests.r1?.status).toBe(200)
    expect(state.requests.r1?.durationMs).toBe(100)
  })

  it('is idempotent for duplicate events', () => {
    const state = createInitialState()
    const event = started()
    applyInspectorEvent(state, event)
    applyInspectorEvent(state, event)
    expect(Object.keys(state.requests)).toHaveLength(1)
  })

  it('keeps pending requests without finished', () => {
    const state = createInitialState()
    applyInspectorEvent(state, started())
    expect(state.requests.r1?.status).toBeUndefined()
  })

  it('stores failed requests', () => {
    const state = createInitialState()
    applyInspectorEvent(state, started())
    applyInspectorEvent(state, {
      type: 'request.failed',
      sessionId: 's1',
      traceId: 't1',
      requestId: 'r1',
      timestamp: 1200,
      error: { name: 'FetchError', message: 'timeout' },
      timing: { startedAt: 1000, finishedAt: 1200, durationMs: 200 },
    })
    expect(state.requests.r1?.failed).toBe(true)
  })

  it('filters by method and status', () => {
    const state = createInitialState()
    applyInspectorEvent(state, started())
    applyInspectorEvent(state, {
      type: 'request.finished',
      sessionId: 's1',
      traceId: 't1',
      requestId: 'r1',
      timestamp: 1100,
      response: { status: 500 },
      timing: { startedAt: 1000, finishedAt: 1100, durationMs: 100 },
    })

    state.filters.methods = ['POST']
    expect(getFilteredRequests(state)).toHaveLength(0)

    state.filters.methods = ['GET']
    state.filters.statuses = ['server-error']
    expect(getFilteredRequests(state)).toHaveLength(1)
  })
})
