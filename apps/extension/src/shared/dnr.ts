export interface InspectorDnrRule {
  id: number
  priority: number
  action: {
    type: 'modifyHeaders'
    requestHeaders: Array<{
      header: string
      operation: 'set'
      value: string
    }>
  }
  condition: {
    tabIds: number[]
    resourceTypes: Array<'main_frame'>
    urlFilter: string
  }
}

export function buildUrlFilter(origin: string, pathPrefix = ''): string {
  const normalizedOrigin = origin.replace(/\/$/, '')
  const normalizedPath = pathPrefix.trim()

  if (!normalizedPath || normalizedPath === '/') {
    return `${normalizedOrigin}/`
  }

  const withLeadingSlash = normalizedPath.startsWith('/')
    ? normalizedPath
    : `/${normalizedPath}`

  return `${normalizedOrigin}${withLeadingSlash.replace(/\/$/, '')}`
}

export function buildInspectorRule(input: {
  ruleId: number
  tabId: number
  origin: string
  pathPrefix?: string
  sessionId: string
  sessionToken: string
}): InspectorDnrRule {
  return {
    id: input.ruleId,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        {
          header: 'x-ssr-inspector-session',
          operation: 'set',
          value: input.sessionId,
        },
        {
          header: 'x-ssr-inspector-token',
          operation: 'set',
          value: input.sessionToken,
        },
      ],
    },
    condition: {
      tabIds: [input.tabId],
      resourceTypes: ['main_frame'],
      urlFilter: buildUrlFilter(input.origin, input.pathPrefix),
    },
  }
}

export function nextRuleId(existingIds: number[]): number {
  const used = new Set(existingIds)
  let id = 1
  while (used.has(id)) {
    id += 1
  }
  return id
}
