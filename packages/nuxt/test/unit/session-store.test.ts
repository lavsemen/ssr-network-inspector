import { describe, expect, it, vi } from 'vitest'
import { InspectorSessionStore } from '../../src/runtime/server/services/session-store'

describe('InspectorSessionStore', () => {
  it('creates and validates sessions', () => {
    const store = new InspectorSessionStore()
    const session = store.createSession({
      clientId: 'client',
      pageOrigin: 'http://localhost:3000',
      ttlMs: 60_000,
    })

    expect(store.validateSession(session.id, session.token)?.id).toBe(session.id)
    expect(store.validateSession(session.id, 'wrong')).toBeUndefined()
  })

  it('rejects expired sessions', () => {
    vi.useFakeTimers()
    const store = new InspectorSessionStore()
    const session = store.createSession({
      clientId: 'client',
      pageOrigin: 'http://localhost:3000',
      ttlMs: 1000,
    })

    vi.advanceTimersByTime(1001)
    expect(store.validateSession(session.id, session.token)).toBeUndefined()
    vi.useRealTimers()
  })

  it('removes sessions and clears subscribers', () => {
    const store = new InspectorSessionStore()
    const session = store.createSession({
      clientId: 'client',
      pageOrigin: 'http://localhost:3000',
      ttlMs: 60_000,
    })

    const subscriber = vi.fn()
    store.subscribe(session.id, subscriber)
    expect(store.removeSession(session.id)).toBe(true)
    store.publish(session.id, {
      type: 'heartbeat',
      sessionId: session.id,
      timestamp: Date.now(),
    })
    expect(subscriber).not.toHaveBeenCalled()
  })

  it('limits backlog size', () => {
    const store = new InspectorSessionStore()
    const session = store.createSession({
      clientId: 'client',
      pageOrigin: 'http://localhost:3000',
      ttlMs: 60_000,
    })

    for (let i = 0; i < 1005; i += 1) {
      store.publish(session.id, {
        type: 'heartbeat',
        sessionId: session.id,
        timestamp: i,
      })
    }

    const backlog = store.getBacklog(session.id)
    expect(backlog).toHaveLength(1000)
    expect(backlog[0]?.timestamp).toBe(5)
  })

  it('cleans up subscribers on unsubscribe', () => {
    const store = new InspectorSessionStore()
    const session = store.createSession({
      clientId: 'client',
      pageOrigin: 'http://localhost:3000',
      ttlMs: 60_000,
    })
    const subscriber = vi.fn()
    const unsubscribe = store.subscribe(session.id, subscriber)
    unsubscribe()
    store.publish(session.id, {
      type: 'heartbeat',
      sessionId: session.id,
      timestamp: 1,
    })
    expect(subscriber).not.toHaveBeenCalled()
  })
})
