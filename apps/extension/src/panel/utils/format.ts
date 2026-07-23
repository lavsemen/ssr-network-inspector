export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) {
    return '—'
  }
  if (ms < 1) {
    return '<1 ms'
  }
  if (ms < 1000) {
    return `${Math.round(ms)} ms`
  }
  return `${(ms / 1000).toFixed(2)} s`
}

export function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) {
    return '—'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function statusTone(status?: number, failed?: boolean): 'success' | 'redirect' | 'client-error' | 'server-error' | 'failed' | 'pending' {
  if (failed) {
    return 'failed'
  }
  if (status === undefined) {
    return 'pending'
  }
  if (status >= 200 && status < 300) {
    return 'success'
  }
  if (status >= 300 && status < 400) {
    return 'redirect'
  }
  if (status >= 400 && status < 500) {
    return 'client-error'
  }
  if (status >= 500) {
    return 'server-error'
  }
  return 'failed'
}

export function transportLabel(transport: 'http' | 'nitro-local' | 'unknown'): string {
  if (transport === 'nitro-local') {
    return 'Nitro local'
  }
  if (transport === 'http') {
    return 'HTTP'
  }
  return 'Unknown'
}

const TRUNCATION_HINT
  = '\n\n… [body preview truncated — increase NUXT_SSR_INSPECTOR_MAX_BODY_BYTES or maxBodyBytes]'

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart()
  return trimmed.startsWith('{') || trimmed.startsWith('[')
}

/**
 * Pretty-print JSON body/header previews for the DevTools panel.
 * Falls back to the original string when content is not valid JSON.
 */
export function formatPreview(value: unknown, emptyMessage: string): string {
  if (value === undefined || value === null || value === '') {
    return emptyMessage
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    }
    catch {
      return String(value)
    }
  }

  const text = String(value).trim()
  if (!text) {
    return emptyMessage
  }

  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  }
  catch {
    // Truncated JSON cannot be parsed — keep raw text and surface a hint.
    if (looksLikeJson(text)) {
      return `${String(value)}${TRUNCATION_HINT}`
    }
    return String(value)
  }
}
