import type { NitroApp } from 'nitropack'
import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getInspectorContext } from '../utils/context'
import { getSessionStore } from '../services/session-store'
import { buildTraceSummary } from '../services/trace-summary'

function finishTrace(event: H3Event): void {
  const context = getInspectorContext(event)
  if (!context || context.finished) {
    return
  }

  context.finished = true
  const finishedAt = Date.now()
  const store = getSessionStore()

  store.publish(context.sessionId, {
    type: 'trace.finished',
    sessionId: context.sessionId,
    traceId: context.traceId,
    timestamp: finishedAt,
    timing: {
      startedAt: context.startedAt,
      finishedAt,
      durationMs: Math.max(0, finishedAt - context.startedAt),
    },
    summary: buildTraceSummary(context),
  })
}

export default (nitroApp: NitroApp) => {
  const config = useRuntimeConfig().ssrNetworkInspector
  const store = getSessionStore()

  if (config?.enabled && config.authToken) {
    store.startCleanup()
  }

  nitroApp.hooks.hook('afterResponse', (event) => {
    finishTrace(event)
  })

  nitroApp.hooks.hook('error', (_error, context) => {
    if (context?.event) {
      finishTrace(context.event)
    }
  })

  nitroApp.hooks.hook('close', () => {
    store.dispose()
  })
}
