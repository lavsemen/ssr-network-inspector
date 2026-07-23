import { defineEventHandler, getHeader, getRequestURL, setResponseHeader } from 'h3'
import { useRuntimeConfig } from '#imports'
import { createId } from '../utils/ids'
import { getSessionStore } from '../services/session-store'
import { setInspectorContext } from '../utils/context'
import type { SsrInspectorContext } from '../../types/module'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event).ssrNetworkInspector
  if (!config?.enabled || !config.authToken) {
    return
  }

  const url = getRequestURL(event)
  if (url.pathname.startsWith(config.routePrefix)) {
    return
  }

  const sessionId = getHeader(event, 'x-ssr-inspector-session')
  const sessionToken = getHeader(event, 'x-ssr-inspector-token')

  if (!sessionId || !sessionToken) {
    return
  }

  const store = getSessionStore()
  const session = store.validateSession(sessionId, sessionToken)

  if (!session) {
    if (config.debug) {
      console.warn('[ssr-network-inspector] Invalid or expired inspector session header ignored')
    }
    return
  }

  const traceId = createId('trace')
  const startedAt = Date.now()

  const context: SsrInspectorContext = {
    sessionId: session.id,
    traceId,
    startedAt,
    requestCount: 0,
    limitWarningSent: false,
    finished: false,
    requestDurations: new Map(),
    successfulRequests: 0,
    failedRequests: 0,
    slowestDurationMs: -1,
  }

  setInspectorContext(event, context)
  setResponseHeader(event, 'x-ssr-inspector-trace-id', traceId)

  store.publish(session.id, {
    type: 'trace.started',
    sessionId: session.id,
    traceId,
    timestamp: startedAt,
    page: {
      method: event.method,
      url: url.href,
      pathname: url.pathname,
    },
  })
})
