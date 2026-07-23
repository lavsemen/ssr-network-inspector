import { describe, expect, it } from 'vitest'
import {
  createBodyPreview,
  getBodySize,
  sanitizeHeaders,
  sanitizeQuery,
  sanitizeUrl,
  serializeError,
} from '../../src/runtime/server/utils/sanitize'

describe('sanitizeHeaders', () => {
  it('redacts sensitive headers case-insensitively', () => {
    const result = sanitizeHeaders(
      {
        Authorization: 'Bearer secret',
        'X-Api-Key': 'private',
        'X-Public': 'visible',
      },
      ['authorization', 'x-api-key'],
    )

    expect(result).toEqual({
      Authorization: '[REDACTED]',
      'X-Api-Key': '[REDACTED]',
      'X-Public': 'visible',
    })
  })
})

describe('sanitizeQuery', () => {
  it('redacts sensitive query params', () => {
    expect(
      sanitizeQuery(
        {
          token: 'secret',
          page: '2',
        },
        ['token'],
      ),
    ).toEqual({
      token: '[REDACTED]',
      page: '2',
    })
  })
})

describe('sanitizeUrl', () => {
  it('redacts query values in absolute urls', () => {
    expect(
      sanitizeUrl('https://api.example.com/user?token=secret&page=2', ['token']),
    ).toBe('https://api.example.com/user?token=%5BREDACTED%5D&page=2')
  })
})

describe('createBodyPreview', () => {
  it('truncates large strings', () => {
    const result = createBodyPreview('x'.repeat(50), 10)
    expect(result.truncated).toBe(true)
    expect(result.preview?.length).toBeLessThanOrEqual(10)
  })

  it('handles circular objects', () => {
    const circular: Record<string, unknown> = { a: 1 }
    circular.self = circular
    const result = createBodyPreview(circular, 20_000)
    expect(result.preview).toContain('[Circular]')
    expect(result.unsupported).toBe(false)
  })
})

describe('getBodySize', () => {
  it('prefers content-length', () => {
    expect(getBodySize('hello', '42')).toBe(42)
  })

  it('returns undefined when unknown', () => {
    expect(getBodySize(undefined)).toBeUndefined()
  })
})

describe('serializeError', () => {
  it('serializes fetch-like errors', () => {
    expect(
      serializeError({
        name: 'FetchError',
        message: 'failed',
        statusCode: 500,
        code: 'ERR_TEST',
      }),
    ).toEqual({
      name: 'FetchError',
      message: 'failed',
      code: 'ERR_TEST',
      status: 500,
    })
  })
})
