import { createError, defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getSessionStore } from '../services/session-store'
import { extractInspectorBearer } from '../utils/auth'
import type { CreateSessionRequest, CreateSessionResponse } from '@lavsemen/ssr-network-inspector-protocol'

export default defineEventHandler(async (event): Promise<CreateSessionResponse> => {
  const config = useRuntimeConfig(event).ssrNetworkInspector

  if (!config?.enabled || !config.authToken) {
    throw createError({ statusCode: 404, statusMessage: 'Inspector disabled' })
  }

  const token = extractInspectorBearer(event)
  const store = getSessionStore()

  if (!store.validateAdminToken(token, config.authToken)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<CreateSessionRequest>(event)

  if (!body?.clientId || !body?.pageOrigin) {
    throw createError({ statusCode: 400, statusMessage: 'clientId and pageOrigin are required' })
  }

  const session = store.createSession({
    clientId: body.clientId,
    pageOrigin: body.pageOrigin,
    ttlMs: config.sessionTtlMs,
  })

  const runtime = useRuntimeConfig(event) as {
    ssrNetworkInspector: typeof config
    app?: { baseURL?: string }
  }
  const appBase = (runtime.app?.baseURL || '/').replace(/\/$/, '')
  const inspectorBase = `${appBase}${config.routePrefix}`

  return {
    sessionId: session.id,
    sessionToken: session.token,
    expiresAt: session.expiresAt,
    eventsUrl: `${inspectorBase}/sessions/${session.id}/events`,
  }
})
