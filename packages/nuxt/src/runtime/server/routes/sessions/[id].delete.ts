import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getSessionStore } from '../../services/session-store'
import { extractInspectorBearer } from '../../utils/auth'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event).ssrNetworkInspector

  if (!config?.enabled || !config.authToken) {
    throw createError({ statusCode: 404, statusMessage: 'Inspector disabled' })
  }

  const sessionId = getRouterParam(event, 'id')
  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'session id required' })
  }

  const token = extractInspectorBearer(event)
  const store = getSessionStore()

  const bySession = token ? store.validateSession(sessionId, token) : undefined
  const byAdmin = token ? store.validateAdminToken(token, config.authToken) : false

  if (!bySession && !byAdmin) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const removed = store.removeSession(sessionId)
  return { ok: removed }
})
