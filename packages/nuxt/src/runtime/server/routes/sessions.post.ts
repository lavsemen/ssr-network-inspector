import { createError, defineEventHandler, getHeader, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getSessionStore } from '../services/session-store'
import type { CreateSessionRequest, CreateSessionResponse } from '@ssr-network-inspector/protocol'

function extractBearer(header: string | undefined): string | undefined {
  if (!header) {
    return undefined
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]
}

export default defineEventHandler(async (event): Promise<CreateSessionResponse> => {
  const config = useRuntimeConfig(event).ssrNetworkInspector

  if (!config?.enabled || !config.authToken) {
    throw createError({ statusCode: 404, statusMessage: 'Inspector disabled' })
  }

  const token = extractBearer(getHeader(event, 'authorization'))
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
