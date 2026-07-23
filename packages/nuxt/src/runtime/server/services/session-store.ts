import type { InspectorEvent } from '@lavsemen/ssr-network-inspector-protocol'
import { createId, createSessionToken } from '../utils/ids'
import { safeEqual } from '../utils/timing-safe'

export type SessionSubscriber = (event: InspectorEvent) => void | Promise<void>

export interface InspectorSession {
  id: string
  token: string
  createdAt: number
  expiresAt: number
  events: InspectorEvent[]
  subscribers: Set<SessionSubscriber>
  clientId: string
  pageOrigin: string
}

export interface CreateSessionInput {
  clientId: string
  pageOrigin: string
  ttlMs: number
}

const MAX_BACKLOG = 1000

export class InspectorSessionStore {
  private readonly sessions = new Map<string, InspectorSession>()
  private cleanupTimer: ReturnType<typeof setInterval> | undefined

  startCleanup(intervalMs = 30_000): void {
    if (this.cleanupTimer) {
      return
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired()
    }, intervalMs)

    if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref()
    }
  }

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  createSession(input: CreateSessionInput): InspectorSession {
    const now = Date.now()
    const session: InspectorSession = {
      id: createId('sess'),
      token: createSessionToken(),
      createdAt: now,
      expiresAt: now + input.ttlMs,
      events: [],
      subscribers: new Set(),
      clientId: input.clientId,
      pageOrigin: input.pageOrigin,
    }

    this.sessions.set(session.id, session)
    return session
  }

  getSession(sessionId: string): InspectorSession | undefined {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return undefined
    }

    if (session.expiresAt <= Date.now()) {
      this.removeSession(sessionId)
      return undefined
    }

    return session
  }

  validateSession(sessionId: string, sessionToken: string): InspectorSession | undefined {
    const session = this.getSession(sessionId)
    if (!session) {
      return undefined
    }

    if (!safeEqual(session.token, sessionToken)) {
      return undefined
    }

    return session
  }

  validateAdminToken(provided: string | undefined, expected: string): boolean {
    if (!provided || !expected) {
      return false
    }
    return safeEqual(provided, expected)
  }

  publish(sessionId: string, event: InspectorEvent): void {
    const session = this.getSession(sessionId)
    if (!session) {
      return
    }

    session.events.push(event)
    if (session.events.length > MAX_BACKLOG) {
      session.events.splice(0, session.events.length - MAX_BACKLOG)
    }

    for (const subscriber of session.subscribers) {
      void Promise.resolve(subscriber(event)).catch(() => {
        // Subscriber failures must not break publishing.
      })
    }
  }

  subscribe(sessionId: string, subscriber: SessionSubscriber): () => void {
    const session = this.getSession(sessionId)
    if (!session) {
      return () => undefined
    }

    session.subscribers.add(subscriber)
    return () => {
      session.subscribers.delete(subscriber)
    }
  }

  getBacklog(sessionId: string): InspectorEvent[] {
    return this.getSession(sessionId)?.events.slice() ?? []
  }

  removeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    session.subscribers.clear()
    this.sessions.delete(sessionId)
    return true
  }

  cleanupExpired(): void {
    const now = Date.now()
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.removeSession(id)
      }
    }
  }

  dispose(): void {
    this.stopCleanup()
    for (const id of Array.from(this.sessions.keys())) {
      this.removeSession(id)
    }
  }

  size(): number {
    return this.sessions.size
  }
}

const GLOBAL_KEY = '__ssrNetworkInspectorSessionStore__'

type GlobalStoreHolder = typeof globalThis & {
  [GLOBAL_KEY]?: InspectorSessionStore
}

export function getSessionStore(): InspectorSessionStore {
  const holder = globalThis as GlobalStoreHolder
  if (!holder[GLOBAL_KEY]) {
    holder[GLOBAL_KEY] = new InspectorSessionStore()
  }
  return holder[GLOBAL_KEY]
}

export function resetSessionStoreForTests(): InspectorSessionStore {
  const holder = globalThis as GlobalStoreHolder
  holder[GLOBAL_KEY]?.dispose()
  holder[GLOBAL_KEY] = new InspectorSessionStore()
  return holder[GLOBAL_KEY]
}
