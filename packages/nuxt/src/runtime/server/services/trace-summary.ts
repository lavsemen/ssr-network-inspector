import type { TraceSummary } from '@ssr-network-inspector/protocol'
import type { SsrInspectorContext } from '../../types/module'

export function buildTraceSummary(context: SsrInspectorContext): TraceSummary {
  let totalBackendDurationMs = 0
  for (const duration of context.requestDurations.values()) {
    totalBackendDurationMs += duration
  }

  return {
    totalRequests: context.requestCount,
    successfulRequests: context.successfulRequests,
    failedRequests: context.failedRequests,
    totalBackendDurationMs,
    ...(context.slowestRequestId ? { slowestRequestId: context.slowestRequestId } : {}),
  }
}

export function recordRequestDuration(
  context: SsrInspectorContext,
  requestId: string,
  durationMs: number,
  success: boolean,
): void {
  context.requestDurations.set(requestId, durationMs)

  if (success) {
    context.successfulRequests += 1
  }
  else {
    context.failedRequests += 1
  }

  if (durationMs >= context.slowestDurationMs) {
    context.slowestDurationMs = durationMs
    context.slowestRequestId = requestId
  }
}
