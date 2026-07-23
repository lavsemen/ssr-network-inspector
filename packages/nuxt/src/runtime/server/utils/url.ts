import { joinURL, withQuery, type QueryObject } from 'ufo'

export function resolveRequestUrl(
  request: string | Request,
  options: {
    baseURL?: string
    query?: QueryObject
    params?: QueryObject
  } = {},
): string {
  const raw = typeof request === 'string' ? request : request.url
  let url = raw

  if (options.baseURL && !/^https?:\/\//i.test(url) && !url.startsWith('/')) {
    url = joinURL(options.baseURL, url)
  }
  else if (options.baseURL && url.startsWith('/') && !/^https?:\/\//i.test(options.baseURL)) {
    url = joinURL(options.baseURL, url)
  }
  else if (options.baseURL && url.startsWith('/') && /^https?:\/\//i.test(options.baseURL)) {
    url = joinURL(options.baseURL, url)
  }

  const query: QueryObject = {
    ...(options.params ?? {}),
    ...(options.query ?? {}),
  }

  if (Object.keys(query).length > 0) {
    url = withQuery(url, query)
  }

  return url
}

export function getPathname(url: string): string {
  try {
    if (url.startsWith('/')) {
      return new URL(url, 'http://localhost').pathname
    }
    return new URL(url).pathname
  }
  catch {
    return url
  }
}

export function getQueryRecord(url: string): Record<string, string | string[]> | undefined {
  try {
    const parsed = new URL(url, 'http://localhost')
    const result: Record<string, string | string[]> = {}

    for (const key of Array.from(new Set(parsed.searchParams.keys()))) {
      const values = parsed.searchParams.getAll(key)
      result[key] = values.length <= 1 ? (values[0] ?? '') : values
    }

    return Object.keys(result).length > 0 ? result : undefined
  }
  catch {
    return undefined
  }
}
