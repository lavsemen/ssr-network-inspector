import { describe, expect, it } from 'vitest'
import { formatPreview } from '../src/panel/utils/format'

describe('formatPreview', () => {
  it('pretty-prints JSON strings', () => {
    expect(formatPreview('{"ok":true,"items":[1,2]}', 'empty')).toBe(
      `{
  "ok": true,
  "items": [
    1,
    2
  ]
}`,
    )
  })

  it('pretty-prints objects', () => {
    expect(formatPreview({ a: 1, b: { c: 2 } }, 'empty')).toBe(
      `{
  "a": 1,
  "b": {
    "c": 2
  }
}`,
    )
  })

  it('returns empty message for missing values', () => {
    expect(formatPreview(undefined, 'No body')).toBe('No body')
    expect(formatPreview('', 'No body')).toBe('No body')
  })

  it('keeps non-JSON text as-is', () => {
    expect(formatPreview('plain text body', 'empty')).toBe('plain text body')
  })

  it('hints when JSON preview looks truncated', () => {
    const truncated = '{"error":false,"data":{"items":[{"id":1'
    const formatted = formatPreview(truncated, 'empty')
    expect(formatted.startsWith(truncated)).toBe(true)
    expect(formatted).toContain('body preview truncated')
  })
})
