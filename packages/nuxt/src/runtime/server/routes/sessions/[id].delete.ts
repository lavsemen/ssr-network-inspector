import { createError, defineEventHandler, getHeader, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getSessionStore } from '../../services/session-store'

function extractBearer(header: string | undefined): string | undefined {
  if (!header) {
    return undefined
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]
}

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event).ssrNetworkInspector

  if (!config?.enabled || !config.authToken) {
    throw createError({ statusCode: 404, statusMessage: 'Inspector disabled' })
  }

  const sessionId = getRouterParam(event, 'id')
  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'session id required' })
  }

  const token = extractBearer(getHeader(event, 'authorization'))
  const store = getSessionStore()

  const bySession = token ? store.validateSession(sessionId, token) : undefined
  const byAdmin = token ? store.validateAdminToken(token, config.authToken) : false

  if (!bySession && !byAdmin) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const removed = store.removeSession(sessionId)
  return { ok: removed }
})
