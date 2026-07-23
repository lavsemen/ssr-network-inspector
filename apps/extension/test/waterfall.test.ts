import { describe, expect, it } from 'vitest'
import { computeWaterfall } from '../src/panel/utils/waterfall'

describe('computeWaterfall', () => {
  it('computes offset and width', () => {
    const result = computeWaterfall({
      requestStartedAt: 1100,
      requestDurationMs: 200,
      traceStartedAt: 1000,
      traceDurationMs: 1000,
    })
    expect(result.offsetPercent).toBeCloseTo(10)
    expect(result.widthPercent).toBeCloseTo(20)
  })

  it('handles zero-duration trace', () => {
    const result = computeWaterfall({
      requestStartedAt: 1000,
      requestDurationMs: 0,
      traceStartedAt: 1000,
      traceDurationMs: 0,
    })
    expect(result.offsetPercent).toBe(0)
    expect(result.widthPercent).toBeGreaterThan(0)
  })
})
