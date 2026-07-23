export interface CaptureOptions {
  requestHeaders?: boolean
  responseHeaders?: boolean
  requestBodyPreview?: boolean
  responseBodyPreview?: boolean
  maxBodyBytes?: number
}

export interface ModuleOptions {
  enabled?: boolean
  routePrefix?: string
  authToken?: string
  sessionTtlMs?: number
  maxRequestsPerTrace?: number
  heartbeatIntervalMs?: number
  capture?: CaptureOptions
  redactHeaders?: string[]
  redactQueryParams?: string[]
  debug?: boolean
}

export interface ResolvedModuleOptions {
  enabled: boolean
  routePrefix: string
  authToken: string
  sessionTtlMs: number
  maxRequestsPerTrace: number
  heartbeatIntervalMs: number
  capture: Required<CaptureOptions>
  redactHeaders: string[]
  redactQueryParams: string[]
  debug: boolean
}

export interface SsrInspectorContext {
  sessionId: string
  traceId: string
  startedAt: number
  requestCount: number
  limitWarningSent: boolean
  finished: boolean
  requestDurations: Map<string, number>
  successfulRequests: number
  failedRequests: number
  slowestRequestId?: string
  slowestDurationMs: number
}

export interface TraceRequestMeta {
  requestId: string
  startedAt: number
  startedPerf: number
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    ssrNetworkInspector: ResolvedModuleOptions
  }
}

declare module '@nuxt/schema' {
  interface RuntimeConfig {
    ssrNetworkInspector: ResolvedModuleOptions
  }
}

export {}
