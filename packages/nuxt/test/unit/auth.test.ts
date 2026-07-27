import { describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import { extractInspectorBearer, INSPECTOR_AUTHORIZATION_HEADER } from '../../src/runtime/server/utils/auth'

function eventWithHeaders(headers: Record<string, string>): H3Event {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  )
  return {
    node: {
      req: {
        headers: normalized,
      },
    },
  } as unknown as H3Event
}

describe('extractInspectorBearer', () => {
  it('reads Authorization Bearer', () => {
    expect(extractInspectorBearer(eventWithHeaders({
      authorization: 'Bearer admin-token',
    }))).toBe('admin-token')
  })

  it('prefers custom inspector header over Authorization', () => {
    expect(extractInspectorBearer(eventWithHeaders({
      authorization: 'Basic dXNlcjpwYXNz',
      [INSPECTOR_AUTHORIZATION_HEADER]: 'Bearer inspector-token',
    }))).toBe('inspector-token')
  })

  it('returns undefined without bearer', () => {
    expect(extractInspectorBearer(eventWithHeaders({
      authorization: 'Basic dXNlcjpwYXNz',
    }))).toBeUndefined()
  })
})
