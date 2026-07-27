import type { H3Event } from 'h3'
import { getHeader } from 'h3'

/** Used when Authorization is occupied by gateway Basic auth. */
export const INSPECTOR_AUTHORIZATION_HEADER = 'x-ssr-inspector-authorization'

function extractBearer(header: string | undefined): string | undefined {
  if (!header) {
    return undefined
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]
}

/**
 * Prefer custom inspector header so Authorization can carry HTTP Basic
 * for upstream gateways (kgateway, nginx, etc.). Fall back to Authorization Bearer.
 */
export function extractInspectorBearer(event: H3Event): string | undefined {
  return (
    extractBearer(getHeader(event, INSPECTOR_AUTHORIZATION_HEADER))
    ?? extractBearer(getHeader(event, 'authorization'))
  )
}
