import { describe, expect, it } from 'vitest'
import { buildInspectorRule, buildUrlFilter, nextRuleId } from '../src/shared/dnr'

describe('dnr helpers', () => {
  it('builds localhost url filter', () => {
    expect(buildUrlFilter('http://localhost:3000')).toBe('http://localhost:3000/')
  })

  it('builds https url filter', () => {
    expect(buildUrlFilter('https://example.com')).toBe('https://example.com/')
  })

  it('builds path-prefixed url filter for subdirectory deploy', () => {
    expect(
      buildUrlFilter('https://epicplan.ru', '/playgrounds/ssr-network-inspector'),
    ).toBe('https://epicplan.ru/playgrounds/ssr-network-inspector')
  })

  it('builds rule for tab and origin', () => {
    const rule = buildInspectorRule({
      ruleId: 3,
      tabId: 42,
      origin: 'http://localhost:3000',
      sessionId: 'sess',
      sessionToken: 'token',
    })

    expect(rule.condition.tabIds).toEqual([42])
    expect(rule.condition.resourceTypes).toEqual(['main_frame'])
    expect(rule.condition.urlFilter).toBe('http://localhost:3000/')
    expect(rule.action.requestHeaders.map((item) => item.header)).toEqual([
      'x-ssr-inspector-session',
      'x-ssr-inspector-token',
    ])
  })

  it('includes path prefix in rule filter', () => {
    const rule = buildInspectorRule({
      ruleId: 1,
      tabId: 7,
      origin: 'https://epicplan.ru',
      pathPrefix: '/playgrounds/ssr-network-inspector',
      sessionId: 'sess',
      sessionToken: 'token',
    })
    expect(rule.condition.urlFilter).toBe('https://epicplan.ru/playgrounds/ssr-network-inspector')
  })

  it('allocates unique rule ids', () => {
    expect(nextRuleId([1, 2, 4])).toBe(3)
  })
})
