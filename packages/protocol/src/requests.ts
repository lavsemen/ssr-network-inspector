export type RequestTransport = 'http' | 'nitro-local' | 'unknown'

export interface RequestTiming {
  startedAt: number
  finishedAt: number
  durationMs: number
}

export interface RequestInfo {
  method: string
  url: string
  pathname: string
  query?: Record<string, string | string[]>
  headers?: Record<string, string>
  bodyPreview?: string
  bodySize?: number
  transport: RequestTransport
}

export interface ResponseInfo {
  status: number
  statusText?: string
  headers?: Record<string, string>
  bodyPreview?: string
  bodySize?: number
}

export interface RequestErrorInfo {
  name: string
  message: string
  code?: string
  status?: number
}

export interface TraceSummary {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalBackendDurationMs: number
  slowestRequestId?: string
}

export interface TracePageInfo {
  method: string
  url: string
  pathname: string
}
