import type { InspectorSettings } from '../stores/inspector-store'

/** Must match Nuxt module `INSPECTOR_AUTHORIZATION_HEADER`. */
export const INSPECTOR_AUTHORIZATION_HEADER = 'X-SSR-Inspector-Authorization'

function encodeBasicAuth(username: string, password: string): string {
  const credentials = `${username}:${password}`
  // Prefer Buffer in Node/tests; btoa in the extension runtime.
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(credentials, 'utf8').toString('base64')
  }
  return btoa(credentials)
}

export function buildGatewayAuthHeaders(settings: Pick<InspectorSettings, 'basicAuthUsername' | 'basicAuthPassword'>): Record<string, string> {
  const username = settings.basicAuthUsername?.trim()
  if (!username) {
    return {}
  }
  return {
    Authorization: `Basic ${encodeBasicAuth(username, settings.basicAuthPassword ?? '')}`,
  }
}

/**
 * When HTTP Basic is configured, put it in Authorization and move the
 * inspector Bearer token to a dedicated header (gateway basic-auth rejects
 * non-Basic Authorization and causes an infinite browser auth dialog).
 */
export function buildInspectorAuthHeaders(
  settings: Pick<InspectorSettings, 'basicAuthUsername' | 'basicAuthPassword'>,
  bearerToken: string,
): Record<string, string> {
  const basic = buildGatewayAuthHeaders(settings)
  if (Object.keys(basic).length > 0) {
    return {
      ...basic,
      [INSPECTOR_AUTHORIZATION_HEADER]: `Bearer ${bearerToken}`,
    }
  }
  return {
    Authorization: `Bearer ${bearerToken}`,
  }
}
