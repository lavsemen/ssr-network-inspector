export interface HealthResponse {
  enabled: boolean
  version: string
}

export interface CreateSessionRequest {
  clientId: string
  pageOrigin: string
}

export interface CreateSessionResponse {
  sessionId: string
  sessionToken: string
  expiresAt: number
  eventsUrl: string
}

export type WarningCode =
  | 'REQUEST_LIMIT_REACHED'
  | 'BODY_TRUNCATED'
  | 'UNSUPPORTED_BODY'
  | 'SESSION_EXPIRES_SOON'
