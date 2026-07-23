import type {
  HeartbeatEvent,
  InspectorEvent,
  InspectorReadyEvent,
  InspectorWarningEvent,
  RequestFailedEvent,
  RequestFinishedEvent,
  RequestStartedEvent,
  TraceFinishedEvent,
  TraceStartedEvent,
} from './events.js'
import type {
  RequestErrorInfo,
  RequestInfo,
  RequestTiming,
  RequestTransport,
  ResponseInfo,
  TracePageInfo,
  TraceSummary,
} from './requests.js'
import type { WarningCode } from './sessions.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isString(value)
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || isNumber(value)
}

function isTransport(value: unknown): value is RequestTransport {
  return value === 'http' || value === 'nitro-local' || value === 'unknown'
}

function isWarningCode(value: unknown): value is WarningCode {
  return (
    value === 'REQUEST_LIMIT_REACHED'
    || value === 'BODY_TRUNCATED'
    || value === 'UNSUPPORTED_BODY'
    || value === 'SESSION_EXPIRES_SOON'
  )
}

function isQuery(value: unknown): value is Record<string, string | string[]> {
  if (!isRecord(value)) {
    return false
  }

  return Object.values(value).every(
    (entry) => isString(entry) || (Array.isArray(entry) && entry.every(isString)),
  )
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false
  }

  return Object.values(value).every(isString)
}

function isPage(value: unknown): value is TracePageInfo {
  return (
    isRecord(value)
    && isString(value.method)
    && isString(value.url)
    && isString(value.pathname)
  )
}

function isRequestInfo(value: unknown): value is RequestInfo {
  if (!isRecord(value)) {
    return false
  }

  if (
    !isString(value.method)
    || !isString(value.url)
    || !isString(value.pathname)
    || !isTransport(value.transport)
  ) {
    return false
  }

  if (value.query !== undefined && !isQuery(value.query)) {
    return false
  }

  if (value.headers !== undefined && !isStringRecord(value.headers)) {
    return false
  }

  return isOptionalString(value.bodyPreview) && isOptionalNumber(value.bodySize)
}

function isResponseInfo(value: unknown): value is ResponseInfo {
  if (!isRecord(value) || !isNumber(value.status)) {
    return false
  }

  if (value.headers !== undefined && !isStringRecord(value.headers)) {
    return false
  }

  return (
    isOptionalString(value.statusText)
    && isOptionalString(value.bodyPreview)
    && isOptionalNumber(value.bodySize)
  )
}

function isTiming(value: unknown): value is RequestTiming {
  return (
    isRecord(value)
    && isNumber(value.startedAt)
    && isNumber(value.finishedAt)
    && isNumber(value.durationMs)
  )
}

function isErrorInfo(value: unknown): value is RequestErrorInfo {
  return (
    isRecord(value)
    && isString(value.name)
    && isString(value.message)
    && isOptionalString(value.code)
    && isOptionalNumber(value.status)
  )
}

function isSummary(value: unknown): value is TraceSummary {
  return (
    isRecord(value)
    && isNumber(value.totalRequests)
    && isNumber(value.successfulRequests)
    && isNumber(value.failedRequests)
    && isNumber(value.totalBackendDurationMs)
    && isOptionalString(value.slowestRequestId)
  )
}

function hasBaseFields(
  value: Record<string, unknown>,
  type: InspectorEvent['type'],
): boolean {
  return value.type === type && isString(value.sessionId) && isNumber(value.timestamp)
}

export function isInspectorReadyEvent(value: unknown): value is InspectorReadyEvent {
  return isRecord(value) && hasBaseFields(value, 'inspector.ready')
}

export function isTraceStartedEvent(value: unknown): value is TraceStartedEvent {
  return (
    isRecord(value)
    && hasBaseFields(value, 'trace.started')
    && isString(value.traceId)
    && isPage(value.page)
  )
}

export function isRequestStartedEvent(value: unknown): value is RequestStartedEvent {
  return (
    isRecord(value)
    && hasBaseFields(value, 'request.started')
    && isString(value.traceId)
    && isString(value.requestId)
    && isRequestInfo(value.request)
  )
}

export function isRequestFinishedEvent(value: unknown): value is RequestFinishedEvent {
  return (
    isRecord(value)
    && hasBaseFields(value, 'request.finished')
    && isString(value.traceId)
    && isString(value.requestId)
    && isResponseInfo(value.response)
    && isTiming(value.timing)
  )
}

export function isRequestFailedEvent(value: unknown): value is RequestFailedEvent {
  return (
    isRecord(value)
    && hasBaseFields(value, 'request.failed')
    && isString(value.traceId)
    && isString(value.requestId)
    && isErrorInfo(value.error)
    && isTiming(value.timing)
  )
}

export function isTraceFinishedEvent(value: unknown): value is TraceFinishedEvent {
  return (
    isRecord(value)
    && hasBaseFields(value, 'trace.finished')
    && isString(value.traceId)
    && isTiming(value.timing)
    && isSummary(value.summary)
  )
}

export function isInspectorWarningEvent(value: unknown): value is InspectorWarningEvent {
  return (
    isRecord(value)
    && hasBaseFields(value, 'inspector.warning')
    && isWarningCode(value.code)
    && isString(value.message)
    && isOptionalString(value.traceId)
  )
}

export function isHeartbeatEvent(value: unknown): value is HeartbeatEvent {
  return isRecord(value) && hasBaseFields(value, 'heartbeat')
}

export function isInspectorEvent(value: unknown): value is InspectorEvent {
  return (
    isInspectorReadyEvent(value)
    || isTraceStartedEvent(value)
    || isRequestStartedEvent(value)
    || isRequestFinishedEvent(value)
    || isRequestFailedEvent(value)
    || isTraceFinishedEvent(value)
    || isInspectorWarningEvent(value)
    || isHeartbeatEvent(value)
  )
}
