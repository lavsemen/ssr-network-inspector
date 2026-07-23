export function computeWaterfall(input: {
  requestStartedAt: number
  requestDurationMs?: number
  traceStartedAt: number
  traceDurationMs: number
  pending?: boolean
}): { offsetPercent: number, widthPercent: number } {
  const traceDuration = Math.max(input.traceDurationMs, 1)
  const offsetMs = Math.max(0, input.requestStartedAt - input.traceStartedAt)
  const offsetPercent = Math.min(100, (offsetMs / traceDuration) * 100)

  if (input.pending || input.requestDurationMs === undefined) {
    const remaining = Math.max(2, 100 - offsetPercent)
    return {
      offsetPercent,
      widthPercent: Math.min(remaining, 24),
    }
  }

  const widthPercent = Math.max(
    (2 / Math.max(traceDuration, 2)) * 100,
    (input.requestDurationMs / traceDuration) * 100,
  )

  return {
    offsetPercent,
    widthPercent: Math.min(100 - offsetPercent, widthPercent),
  }
}
