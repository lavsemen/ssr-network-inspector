import { describe, expect, it } from 'vitest'
import { isAbortError, parseSseChunk } from '../src/panel/utils/sse-parser'

describe('sse parser', () => {
  it('parses events split across chunks', () => {
    const first = parseSseChunk('', 'data: {"type":"heartbeat","sessionId":"s","timestamp":1')
    expect(first.events).toHaveLength(0)
    const second = parseSseChunk(first.rest, '}\n\n')
    expect(second.events).toHaveLength(1)
    expect(second.events[0]?.type).toBe('heartbeat')
  })

  it('parses multiple events in one chunk', () => {
    const result = parseSseChunk(
      '',
      'data: {"type":"heartbeat","sessionId":"s","timestamp":1}\n\n'
      + 'data: {"type":"heartbeat","sessionId":"s","timestamp":2}\n\n',
    )
    expect(result.events).toHaveLength(2)
  })

  it('warns on malformed json without stopping', () => {
    const result = parseSseChunk('', 'data: {bad json}\n\n')
    expect(result.events).toHaveLength(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('detects abort errors', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true)
  })
})
