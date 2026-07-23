import { ofetch } from 'ofetch'
import type { FetchContext, FetchHooks, FetchOptions, ResponseType } from 'ofetch'
import type { H3Event } from 'h3'
import type { QueryObject } from 'ufo'
import type { ResolvedModuleOptions } from '../../types/module'
import { createId } from '../utils/ids'
import { getInspectorContext, getRequestMeta, setRequestMeta } from '../utils/context'
import { getSessionStore } from './session-store'
import { recordRequestDuration } from './trace-summary'
import {
  createBodyPreview,
  getBodySize,
  sanitizeHeaders,
  sanitizeQuery,
  sanitizeUrl,
  serializeError,
} from '../utils/sanitize'
import { detectTransport } from '../utils/transport'
import { getPathname, getQueryRecord, resolveRequestUrl } from '../utils/url'

type HookName = keyof FetchHooks
type HookFn = (context: FetchContext) => void | Promise<void>

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> | undefined {
  if (!headers) {
    return undefined
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }

  return { ...headers }
}

function normalizeHooks<K extends HookName>(hook: FetchHooks[K] | undefined): HookFn[] {
  if (!hook) {
    return []
  }
  return (Array.isArray(hook) ? hook : [hook]) as HookFn[]
}

/**
 * ofetch resolveFetchOptions does `{ ...defaults, ...input }`, so call-site
 * onResponse/onRequestError from useFetch overwrite $fetch.create defaults.
 * Always merge instrumentation hooks into the per-call options instead.
 */
function withInstrumentedHooks(
  options: FetchOptions | undefined,
  hooks: FetchHooks,
): FetchOptions {
  const input = options ?? {}
  return {
    ...input,
    onRequest: [...normalizeHooks(hooks.onRequest), ...normalizeHooks(input.onRequest)],
    onResponse: [...normalizeHooks(hooks.onResponse), ...normalizeHooks(input.onResponse)],
    onRequestError: [
      ...normalizeHooks(hooks.onRequestError),
      ...normalizeHooks(input.onRequestError),
    ],
    onResponseError: [
      ...normalizeHooks(hooks.onResponseError),
      ...normalizeHooks(input.onResponseError),
    ],
  }
}

export function createInstrumentedFetch(
  config: ResolvedModuleOptions,
  getEvent: () => H3Event | undefined,
) {
  const hooks: FetchHooks = {
    async onRequest(context) {
      const event = getEvent()
      if (!event) {
        return
      }

      const inspector = getInspectorContext(event)
      if (!inspector || inspector.finished) {
        return
      }

      if (inspector.requestCount >= config.maxRequestsPerTrace) {
        if (!inspector.limitWarningSent) {
          inspector.limitWarningSent = true
          getSessionStore().publish(inspector.sessionId, {
            type: 'inspector.warning',
            sessionId: inspector.sessionId,
            traceId: inspector.traceId,
            timestamp: Date.now(),
            code: 'REQUEST_LIMIT_REACHED',
            message: `Request limit of ${config.maxRequestsPerTrace} reached for this SSR trace`,
          })
        }
        return
      }

      const requestId = createId('req')
      const startedAt = Date.now()
      const startedPerf = performance.now()
      const method = (context.options.method ?? 'GET').toUpperCase()
      const resolvedUrl = resolveRequestUrl(context.request, {
        baseURL: context.options.baseURL,
        query: context.options.query as QueryObject | undefined,
        params: (context.options as FetchOptions & { params?: QueryObject }).params,
      })

      const pathname = getPathname(resolvedUrl)
      if (pathname.startsWith(config.routePrefix)) {
        return
      }

      inspector.requestCount += 1
      setRequestMeta(context.options, { requestId, startedAt, startedPerf })

      const rawQuery = getQueryRecord(resolvedUrl)
      const query = sanitizeQuery(rawQuery, config.redactQueryParams)
      const headers = config.capture.requestHeaders
        ? sanitizeHeaders(headersToRecord(context.options.headers), config.redactHeaders)
        : undefined

      let bodyPreview: string | undefined

      if (config.capture.requestBodyPreview && context.options.body !== undefined) {
        const preview = createBodyPreview(context.options.body, config.capture.maxBodyBytes)
        bodyPreview = preview.preview
        if (preview.truncated) {
          getSessionStore().publish(inspector.sessionId, {
            type: 'inspector.warning',
            sessionId: inspector.sessionId,
            traceId: inspector.traceId,
            timestamp: Date.now(),
            code: 'BODY_TRUNCATED',
            message: 'Request body preview truncated',
          })
        }
        if (preview.unsupported) {
          getSessionStore().publish(inspector.sessionId, {
            type: 'inspector.warning',
            sessionId: inspector.sessionId,
            traceId: inspector.traceId,
            timestamp: Date.now(),
            code: 'UNSUPPORTED_BODY',
            message: 'Request body preview unsupported',
          })
        }
      }

      const bodySize = getBodySize(context.options.body)

      getSessionStore().publish(inspector.sessionId, {
        type: 'request.started',
        sessionId: inspector.sessionId,
        traceId: inspector.traceId,
        requestId,
        timestamp: startedAt,
        request: {
          method,
          url: sanitizeUrl(resolvedUrl, config.redactQueryParams),
          pathname,
          ...(query ? { query } : {}),
          ...(headers ? { headers } : {}),
          ...(bodyPreview !== undefined ? { bodyPreview } : {}),
          ...(bodySize !== undefined ? { bodySize } : {}),
          transport: detectTransport(resolvedUrl),
        },
      })
    },

    async onResponse(context) {
      const event = getEvent()
      const inspector = event ? getInspectorContext(event) : undefined
      const meta = getRequestMeta(context.options)
      if (!inspector || !meta) {
        return
      }

      const finishedAt = Date.now()
      const durationMs = Math.max(0, performance.now() - meta.startedPerf)
      const responseHeaders = config.capture.responseHeaders
        ? sanitizeHeaders(context.response.headers, config.redactHeaders)
        : undefined

      let bodyPreview: string | undefined
      if (config.capture.responseBodyPreview) {
        const preview = createBodyPreview(context.response._data, config.capture.maxBodyBytes)
        bodyPreview = preview.preview
        if (preview.truncated) {
          getSessionStore().publish(inspector.sessionId, {
            type: 'inspector.warning',
            sessionId: inspector.sessionId,
            traceId: inspector.traceId,
            timestamp: Date.now(),
            code: 'BODY_TRUNCATED',
            message: 'Response body preview truncated',
          })
        }
      }

      const contentLength = context.response.headers.get('content-length')
      const bodySize = getBodySize(context.response._data, contentLength)

      recordRequestDuration(inspector, meta.requestId, durationMs, context.response.ok)

      getSessionStore().publish(inspector.sessionId, {
        type: 'request.finished',
        sessionId: inspector.sessionId,
        traceId: inspector.traceId,
        requestId: meta.requestId,
        timestamp: finishedAt,
        response: {
          status: context.response.status,
          statusText: context.response.statusText,
          ...(responseHeaders ? { headers: responseHeaders } : {}),
          ...(bodyPreview !== undefined ? { bodyPreview } : {}),
          ...(bodySize !== undefined ? { bodySize } : {}),
        },
        timing: {
          startedAt: meta.startedAt,
          finishedAt,
          durationMs,
        },
      })
    },

    async onRequestError(context) {
      const event = getEvent()
      const inspector = event ? getInspectorContext(event) : undefined
      const meta = getRequestMeta(context.options)
      if (!inspector || !meta) {
        return
      }

      const finishedAt = Date.now()
      const durationMs = Math.max(0, performance.now() - meta.startedPerf)
      recordRequestDuration(inspector, meta.requestId, durationMs, false)

      getSessionStore().publish(inspector.sessionId, {
        type: 'request.failed',
        sessionId: inspector.sessionId,
        traceId: inspector.traceId,
        requestId: meta.requestId,
        timestamp: finishedAt,
        error: serializeError(context.error),
        timing: {
          startedAt: meta.startedAt,
          finishedAt,
          durationMs,
        },
      })
    },

    async onResponseError(context) {
      const event = getEvent()
      const inspector = event ? getInspectorContext(event) : undefined
      const meta = getRequestMeta(context.options)
      if (!inspector || !meta) {
        return
      }

      if (context.response) {
        const finishedAt = Date.now()
        const durationMs = Math.max(0, performance.now() - meta.startedPerf)
        const responseHeaders = config.capture.responseHeaders
          ? sanitizeHeaders(context.response.headers, config.redactHeaders)
          : undefined

        let bodyPreview: string | undefined
        if (config.capture.responseBodyPreview) {
          bodyPreview = createBodyPreview(context.response._data, config.capture.maxBodyBytes).preview
        }

        const contentLength = context.response.headers.get('content-length')
        const bodySize = getBodySize(context.response._data, contentLength)
        const success = context.response.status >= 200 && context.response.status < 400
        recordRequestDuration(inspector, meta.requestId, durationMs, success)

        getSessionStore().publish(inspector.sessionId, {
          type: 'request.finished',
          sessionId: inspector.sessionId,
          traceId: inspector.traceId,
          requestId: meta.requestId,
          timestamp: finishedAt,
          response: {
            status: context.response.status,
            statusText: context.response.statusText,
            ...(responseHeaders ? { headers: responseHeaders } : {}),
            ...(bodyPreview !== undefined ? { bodyPreview } : {}),
            ...(bodySize !== undefined ? { bodySize } : {}),
          },
          timing: {
            startedAt: meta.startedAt,
            finishedAt,
            durationMs,
          },
        })
        return
      }

      const finishedAt = Date.now()
      const durationMs = Math.max(0, performance.now() - meta.startedPerf)
      recordRequestDuration(inspector, meta.requestId, durationMs, false)

      getSessionStore().publish(inspector.sessionId, {
        type: 'request.failed',
        sessionId: inspector.sessionId,
        traceId: inspector.traceId,
        requestId: meta.requestId,
        timestamp: finishedAt,
        error: serializeError(context.error),
        timing: {
          startedAt: meta.startedAt,
          finishedAt,
          durationMs,
        },
      })
    },
  }

  const baseFetch = ofetch.create({})

  const instrumented = (async <T = unknown, R extends ResponseType = 'json'>(
    request: Parameters<typeof ofetch>[0],
    options?: Parameters<typeof ofetch>[1],
  ) => {
    return baseFetch<T, R>(request, withInstrumentedHooks(options, hooks) as typeof options)
  }) as typeof ofetch

  instrumented.raw = (async (request, options) => {
    return baseFetch.raw(request, withInstrumentedHooks(options, hooks) as typeof options)
  }) as typeof ofetch.raw

  instrumented.create = ((defaults, globalOptions) => {
    const nested = baseFetch.create(defaults, globalOptions)
    const nestedInstrumented = (async <T = unknown, R extends ResponseType = 'json'>(
      request: Parameters<typeof ofetch>[0],
      options?: Parameters<typeof ofetch>[1],
    ) => {
      return nested<T, R>(request, withInstrumentedHooks(options, hooks) as typeof options)
    }) as typeof ofetch

    nestedInstrumented.raw = (async (request, options) => {
      return nested.raw(request, withInstrumentedHooks(options, hooks) as typeof options)
    }) as typeof ofetch.raw
    nestedInstrumented.create = instrumented.create
    nestedInstrumented.native = nested.native
    return nestedInstrumented
  }) as typeof ofetch.create

  instrumented.native = baseFetch.native

  return instrumented
}
