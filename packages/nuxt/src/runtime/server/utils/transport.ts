import type { RequestTransport } from '@lavsemen/ssr-network-inspector-protocol'

export function detectTransport(url: string): RequestTransport {
  if (url.startsWith('/')) {
    return 'nitro-local'
  }

  if (/^https?:\/\//i.test(url)) {
    return 'http'
  }

  return 'unknown'
}
