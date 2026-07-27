import { describe, expect, it } from 'vitest'
import {
  INSPECTOR_AUTHORIZATION_HEADER,
  buildGatewayAuthHeaders,
  buildInspectorAuthHeaders,
} from '../src/panel/utils/auth-headers'

describe('auth headers', () => {
  it('uses Authorization Bearer when basic auth is not set', () => {
    expect(buildInspectorAuthHeaders({
      basicAuthUsername: '',
      basicAuthPassword: '',
    }, 'dev-secret')).toEqual({
      Authorization: 'Bearer dev-secret',
    })
  })

  it('moves inspector token to custom header when basic auth is set', () => {
    const headers = buildInspectorAuthHeaders({
      basicAuthUsername: 'yt_basic',
      basicAuthPassword: 'secret',
    }, 'dev-secret')

    expect(headers.Authorization).toMatch(/^Basic /)
    expect(headers[INSPECTOR_AUTHORIZATION_HEADER]).toBe('Bearer dev-secret')
    expect(Buffer.from(headers.Authorization!.slice(6), 'base64').toString('utf8')).toBe('yt_basic:secret')
  })

  it('builds gateway-only basic headers for health', () => {
    expect(buildGatewayAuthHeaders({
      basicAuthUsername: 'yt_basic',
      basicAuthPassword: 'secret',
    }).Authorization).toMatch(/^Basic /)

    expect(buildGatewayAuthHeaders({
      basicAuthUsername: '  ',
      basicAuthPassword: 'secret',
    })).toEqual({})
  })
})
