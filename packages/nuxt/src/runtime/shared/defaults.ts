import type { ModuleOptions, ResolvedModuleOptions } from '../types/module'

export const DEFAULT_MODULE_OPTIONS: ResolvedModuleOptions = {
  enabled: false,
  routePrefix: '/__ssr-network-inspector',
  authToken: '',
  sessionTtlMs: 5 * 60 * 1000,
  maxRequestsPerTrace: 200,
  heartbeatIntervalMs: 15_000,
  capture: {
    requestHeaders: true,
    responseHeaders: true,
    requestBodyPreview: false,
    responseBodyPreview: false,
    maxBodyBytes: 20_000,
  },
  redactHeaders: [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'proxy-authorization',
  ],
  redactQueryParams: [
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'apikey',
    'password',
  ],
  debug: false,
}

export function resolveModuleOptions(options: ModuleOptions): ResolvedModuleOptions {
  return {
    enabled: options.enabled ?? DEFAULT_MODULE_OPTIONS.enabled,
    routePrefix: options.routePrefix ?? DEFAULT_MODULE_OPTIONS.routePrefix,
    authToken: options.authToken ?? '',
    sessionTtlMs: options.sessionTtlMs ?? DEFAULT_MODULE_OPTIONS.sessionTtlMs,
    maxRequestsPerTrace: options.maxRequestsPerTrace ?? DEFAULT_MODULE_OPTIONS.maxRequestsPerTrace,
    heartbeatIntervalMs: options.heartbeatIntervalMs ?? DEFAULT_MODULE_OPTIONS.heartbeatIntervalMs,
    capture: {
      requestHeaders: options.capture?.requestHeaders ?? DEFAULT_MODULE_OPTIONS.capture.requestHeaders,
      responseHeaders: options.capture?.responseHeaders ?? DEFAULT_MODULE_OPTIONS.capture.responseHeaders,
      requestBodyPreview:
        options.capture?.requestBodyPreview ?? DEFAULT_MODULE_OPTIONS.capture.requestBodyPreview,
      responseBodyPreview:
        options.capture?.responseBodyPreview ?? DEFAULT_MODULE_OPTIONS.capture.responseBodyPreview,
      maxBodyBytes: options.capture?.maxBodyBytes ?? DEFAULT_MODULE_OPTIONS.capture.maxBodyBytes,
    },
    redactHeaders: options.redactHeaders ?? DEFAULT_MODULE_OPTIONS.redactHeaders,
    redactQueryParams: options.redactQueryParams ?? DEFAULT_MODULE_OPTIONS.redactQueryParams,
    debug: options.debug ?? DEFAULT_MODULE_OPTIONS.debug,
  }
}
