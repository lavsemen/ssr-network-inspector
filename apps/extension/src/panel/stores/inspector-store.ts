import { reactive } from 'vue'
import type { InspectorEvent, RequestTransport } from '@lavsemen/ssr-network-inspector-protocol'
import { statusTone } from '../utils/format'

export interface InspectorSettings {
  serverOrigin: string
  routePrefix: string
  pathPrefix: string
  adminToken: string
  rememberToken: boolean
}

export interface SessionViewModel {
  id: string
  expiresAt?: number
}

export interface TraceViewModel {
  id: string
  sessionId: string
  startedAt: number
  finishedAt?: number
  durationMs?: number
  pageMethod: string
  pageUrl: string
  pagePathname: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalBackendDurationMs: number
  slowestRequestId?: string
}

export interface RequestViewModel {
  id: string
  traceId: string
  sessionId: string
  method: string
  url: string
  pathname: string
  query?: Record<string, string | string[]>
  requestHeaders?: Record<string, string>
  requestBodyPreview?: string
  responseHeaders?: Record<string, string>
  responseBodyPreview?: string
  status?: number
  statusText?: string
  transport: RequestTransport
  startedAt: number
  finishedAt?: number
  durationMs?: number
  bodySize?: number
  failed?: boolean
  errorName?: string
  errorMessage?: string
  rawEvents: InspectorEvent[]
}

export interface InspectorPanelState {
  connection: {
    status: 'idle' | 'connecting' | 'recording' | 'reconnecting' | 'stopped' | 'error'
    error?: string
  }
  settings: InspectorSettings
  sessions: Record<string, SessionViewModel>
  traces: Record<string, TraceViewModel>
  requests: Record<string, RequestViewModel>
  selectedRequestId?: string
  selectedTraceId?: string
  filters: {
    query: string
    methods: string[]
    statuses: Array<'success' | 'redirect' | 'client-error' | 'server-error' | 'failed'>
    transports: Array<'http' | 'nitro-local' | 'unknown'>
  }
  preserveLog: boolean
  warnings: string[]
}

const MAX_TRACES = 20
const MAX_REQUESTS = 2000

export function createInitialState(settings?: Partial<InspectorSettings>): InspectorPanelState {
  return {
    connection: {
      status: 'idle',
    },
    settings: {
      serverOrigin: settings?.serverOrigin ?? '',
      routePrefix: settings?.routePrefix ?? '/__ssr-network-inspector',
      pathPrefix: settings?.pathPrefix ?? '',
      adminToken: settings?.adminToken ?? '',
      rememberToken: settings?.rememberToken ?? false,
    },
    sessions: {},
    traces: {},
    requests: {},
    filters: {
      query: '',
      methods: [],
      statuses: [],
      transports: [],
    },
    preserveLog: false,
    warnings: [],
  }
}

function enforceLimits(state: InspectorPanelState): void {
  const traceIds = Object.values(state.traces)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((trace) => trace.id)

  while (traceIds.length > MAX_TRACES) {
    const oldest = traceIds.shift()
    if (!oldest) {
      break
    }
    delete state.traces[oldest]
    for (const [requestId, request] of Object.entries(state.requests)) {
      if (request.traceId === oldest) {
        delete state.requests[requestId]
      }
    }
    if (state.selectedTraceId === oldest) {
      state.selectedTraceId = undefined
    }
  }

  const requestIds = Object.values(state.requests)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((request) => request.id)

  while (requestIds.length > MAX_REQUESTS) {
    const oldest = requestIds.shift()
    if (!oldest) {
      break
    }
    delete state.requests[oldest]
    if (state.selectedRequestId === oldest) {
      state.selectedRequestId = undefined
    }
  }
}

export function applyInspectorEvent(state: InspectorPanelState, event: InspectorEvent): void {
  if (event.type === 'heartbeat' || event.type === 'inspector.ready') {
    return
  }

  if (event.type === 'inspector.warning') {
    state.warnings.push(event.message)
    if (state.warnings.length > 50) {
      state.warnings.shift()
    }
    return
  }

  if (event.type === 'trace.started') {
    if (!state.preserveLog) {
      state.traces = {}
      state.requests = {}
      state.selectedRequestId = undefined
    }

    state.traces[event.traceId] = {
      id: event.traceId,
      sessionId: event.sessionId,
      startedAt: event.timestamp,
      pageMethod: event.page.method,
      pageUrl: event.page.url,
      pagePathname: event.page.pathname,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalBackendDurationMs: 0,
    }
    state.selectedTraceId = event.traceId
    state.sessions[event.sessionId] = {
      id: event.sessionId,
    }
    enforceLimits(state)
    return
  }

  if (event.type === 'request.started') {
    const existing = state.requests[event.requestId]
    state.requests[event.requestId] = {
      id: event.requestId,
      traceId: event.traceId,
      sessionId: event.sessionId,
      method: event.request.method,
      url: event.request.url,
      pathname: event.request.pathname,
      query: event.request.query,
      requestHeaders: event.request.headers,
      requestBodyPreview: event.request.bodyPreview,
      transport: event.request.transport,
      startedAt: event.timestamp,
      bodySize: event.request.bodySize,
      finishedAt: existing?.finishedAt,
      durationMs: existing?.durationMs,
      status: existing?.status,
      statusText: existing?.statusText,
      responseHeaders: existing?.responseHeaders,
      responseBodyPreview: existing?.responseBodyPreview,
      failed: existing?.failed,
      errorName: existing?.errorName,
      errorMessage: existing?.errorMessage,
      rawEvents: [...(existing?.rawEvents ?? []).filter((item) => item.type !== 'request.started'), event],
    }

    const trace = state.traces[event.traceId]
    if (trace) {
      trace.totalRequests = Object.values(state.requests).filter((item) => item.traceId === event.traceId).length
    }

    if (!state.selectedRequestId) {
      state.selectedRequestId = event.requestId
    }
    if (!state.selectedTraceId) {
      state.selectedTraceId = event.traceId
    }

    enforceLimits(state)
    return
  }

  if (event.type === 'request.finished') {
    const existing = state.requests[event.requestId]
    state.requests[event.requestId] = {
      id: event.requestId,
      traceId: event.traceId,
      sessionId: event.sessionId,
      method: existing?.method ?? 'GET',
      url: existing?.url ?? '',
      pathname: existing?.pathname ?? '/',
      query: existing?.query,
      requestHeaders: existing?.requestHeaders,
      requestBodyPreview: existing?.requestBodyPreview,
      transport: existing?.transport ?? 'unknown',
      startedAt: existing?.startedAt ?? event.timing.startedAt,
      finishedAt: event.timing.finishedAt,
      durationMs: event.timing.durationMs,
      status: event.response.status,
      statusText: event.response.statusText,
      responseHeaders: event.response.headers,
      responseBodyPreview: event.response.bodyPreview,
      bodySize: event.response.bodySize ?? existing?.bodySize,
      failed: false,
      rawEvents: [...(existing?.rawEvents ?? []).filter((item) => item.type !== 'request.finished'), event],
    }

    const trace = state.traces[event.traceId]
    if (trace) {
      const requests = Object.values(state.requests).filter((item) => item.traceId === event.traceId)
      trace.totalRequests = requests.length
      trace.successfulRequests = requests.filter((item) => !item.failed && (item.status ?? 0) < 400).length
      trace.failedRequests = requests.filter((item) => item.failed || (item.status ?? 0) >= 400).length
      trace.totalBackendDurationMs = requests.reduce((sum, item) => sum + (item.durationMs ?? 0), 0)
      const slowest = requests
        .filter((item) => item.durationMs !== undefined)
        .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0]
      trace.slowestRequestId = slowest?.id
    }

    enforceLimits(state)
    return
  }

  if (event.type === 'request.failed') {
    const existing = state.requests[event.requestId]
    state.requests[event.requestId] = {
      id: event.requestId,
      traceId: event.traceId,
      sessionId: event.sessionId,
      method: existing?.method ?? 'GET',
      url: existing?.url ?? '',
      pathname: existing?.pathname ?? '/',
      query: existing?.query,
      requestHeaders: existing?.requestHeaders,
      requestBodyPreview: existing?.requestBodyPreview,
      transport: existing?.transport ?? 'unknown',
      startedAt: existing?.startedAt ?? event.timing.startedAt,
      finishedAt: event.timing.finishedAt,
      durationMs: event.timing.durationMs,
      status: event.error.status,
      bodySize: existing?.bodySize,
      failed: true,
      errorName: event.error.name,
      errorMessage: event.error.message,
      rawEvents: [...(existing?.rawEvents ?? []).filter((item) => item.type !== 'request.failed'), event],
    }

    const trace = state.traces[event.traceId]
    if (trace) {
      const requests = Object.values(state.requests).filter((item) => item.traceId === event.traceId)
      trace.totalRequests = requests.length
      trace.failedRequests = requests.filter((item) => item.failed || (item.status ?? 0) >= 400).length
      trace.successfulRequests = requests.filter((item) => !item.failed && (item.status ?? 0) < 400).length
      trace.totalBackendDurationMs = requests.reduce((sum, item) => sum + (item.durationMs ?? 0), 0)
    }

    enforceLimits(state)
    return
  }

  if (event.type === 'trace.finished') {
    const existing = state.traces[event.traceId]
    state.traces[event.traceId] = {
      id: event.traceId,
      sessionId: event.sessionId,
      startedAt: existing?.startedAt ?? event.timing.startedAt,
      finishedAt: event.timing.finishedAt,
      durationMs: event.timing.durationMs,
      pageMethod: existing?.pageMethod ?? 'GET',
      pageUrl: existing?.pageUrl ?? '',
      pagePathname: existing?.pagePathname ?? '/',
      totalRequests: event.summary.totalRequests,
      successfulRequests: event.summary.successfulRequests,
      failedRequests: event.summary.failedRequests,
      totalBackendDurationMs: event.summary.totalBackendDurationMs,
      slowestRequestId: event.summary.slowestRequestId,
    }
    state.selectedTraceId = event.traceId
    enforceLimits(state)
  }
}

export function clearRecords(state: InspectorPanelState): void {
  state.traces = {}
  state.requests = {}
  state.selectedRequestId = undefined
  state.selectedTraceId = undefined
  state.warnings = []
}

export function getFilteredRequests(state: InspectorPanelState): RequestViewModel[] {
  const query = state.filters.query.trim().toLowerCase()

  return Object.values(state.requests)
    .filter((request) => {
      if (state.selectedTraceId && request.traceId !== state.selectedTraceId && !state.preserveLog) {
        // When preserve log is off we still show selected trace; with preserve log show all unless filtered later.
      }

      if (state.filters.methods.length > 0 && !state.filters.methods.includes(request.method)) {
        return false
      }

      if (state.filters.transports.length > 0 && !state.filters.transports.includes(request.transport)) {
        return false
      }

      if (state.filters.statuses.length > 0) {
        const tone = statusTone(request.status, request.failed)
        if (tone === 'pending' || !state.filters.statuses.includes(tone)) {
          return false
        }
      }

      if (!query) {
        return true
      }

      return (
        request.pathname.toLowerCase().includes(query)
        || request.url.toLowerCase().includes(query)
        || request.method.toLowerCase().includes(query)
        || String(request.status ?? '').includes(query)
      )
    })
    .sort((a, b) => a.startedAt - b.startedAt)
}

export function createInspectorStore(settings?: Partial<InspectorSettings>) {
  const state = reactive(createInitialState(settings))
  return {
    state,
    applyEvent(event: InspectorEvent) {
      applyInspectorEvent(state, event)
    },
    clear() {
      clearRecords(state)
    },
  }
}
