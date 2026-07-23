import type {
  RequestErrorInfo,
  RequestInfo,
  RequestTiming,
  ResponseInfo,
  TracePageInfo,
  TraceSummary,
} from './requests.js'
import type { WarningCode } from './sessions.js'

export interface InspectorReadyEvent {
  type: 'inspector.ready'
  sessionId: string
  timestamp: number
}

export interface TraceStartedEvent {
  type: 'trace.started'
  sessionId: string
  traceId: string
  timestamp: number
  page: TracePageInfo
}

export interface RequestStartedEvent {
  type: 'request.started'
  sessionId: string
  traceId: string
  requestId: string
  timestamp: number
  request: RequestInfo
}

export interface RequestFinishedEvent {
  type: 'request.finished'
  sessionId: string
  traceId: string
  requestId: string
  timestamp: number
  response: ResponseInfo
  timing: RequestTiming
}

export interface RequestFailedEvent {
  type: 'request.failed'
  sessionId: string
  traceId: string
  requestId: string
  timestamp: number
  error: RequestErrorInfo
  timing: RequestTiming
}

export interface TraceFinishedEvent {
  type: 'trace.finished'
  sessionId: string
  traceId: string
  timestamp: number
  timing: RequestTiming
  summary: TraceSummary
}

export interface InspectorWarningEvent {
  type: 'inspector.warning'
  sessionId: string
  traceId?: string
  timestamp: number
  code: WarningCode
  message: string
}

export interface HeartbeatEvent {
  type: 'heartbeat'
  sessionId: string
  timestamp: number
}

export type InspectorEvent =
  | InspectorReadyEvent
  | TraceStartedEvent
  | RequestStartedEvent
  | RequestFinishedEvent
  | RequestFailedEvent
  | TraceFinishedEvent
  | InspectorWarningEvent
  | HeartbeatEvent

export type InspectorEventType = InspectorEvent['type']
