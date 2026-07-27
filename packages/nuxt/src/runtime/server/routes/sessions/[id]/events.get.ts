import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getSessionStore } from '../../../services/session-store'
import { extractInspectorBearer } from '../../../utils/auth'
import { createCompatibleEventStream } from '../../../utils/sse-stream'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event).ssrNetworkInspector

  if (!config?.enabled || !config.authToken) {
    throw createError({ statusCode: 404, statusMessage: 'Inspector disabled' })
  }

  const sessionId = getRouterParam(event, 'id')
  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'session id required' })
  }

  const sessionToken = extractInspectorBearer(event)
  const store = getSessionStore()
  const session = sessionToken ? store.validateSession(sessionId, sessionToken) : undefined

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const stream = createCompatibleEventStream(event)
  let closed = false

  const send = async (payload: unknown) => {
    if (closed) {
      return
    }
    await stream.push(JSON.stringify(payload))
  }

  const unsubscribe = store.subscribe(sessionId, (inspectorEvent) => {
    void send(inspectorEvent)
  })

  const heartbeat = setInterval(() => {
    void send({
      type: 'heartbeat',
      sessionId,
      timestamp: Date.now(),
    })
  }, config.heartbeatIntervalMs)

  if (typeof heartbeat === 'object' && 'unref' in heartbeat) {
    heartbeat.unref()
  }

  stream.onClosed(() => {
    closed = true
    clearInterval(heartbeat)
    unsubscribe()
  })

  // Important: return send() before awaiting pushes to avoid TransformStream backpressure deadlock.
  const response = stream.send()

  void (async () => {
    for (const backlogEvent of store.getBacklog(sessionId)) {
      await send(backlogEvent)
    }
    await send({
      type: 'inspector.ready',
      sessionId,
      timestamp: Date.now(),
    })
  })()

  return response
})
