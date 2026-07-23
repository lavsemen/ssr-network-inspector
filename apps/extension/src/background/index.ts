import type { ExtensionMessage, ExtensionResponse } from '../shared/messages'
import { buildInspectorRule, nextRuleId } from '../shared/dnr'

const STORAGE_KEY = 'inspectorRuleMap'

async function getRuleMap(): Promise<Record<string, number>> {
  const result = await chrome.storage.session.get(STORAGE_KEY)
  const value = result[STORAGE_KEY]
  if (value && typeof value === 'object') {
    return value as Record<string, number>
  }
  return {}
}

async function setRuleMap(map: Record<string, number>): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEY]: map })
}

async function handleAddRule(message: Extract<ExtensionMessage, { type: 'inspector.add-rule' }>): Promise<ExtensionResponse> {
  const map = await getRuleMap()
  const existingId = map[String(message.tabId)]
  const removeRuleIds = existingId ? [existingId] : []

  const sessionRules = await chrome.declarativeNetRequest.getSessionRules()
  const ruleId = nextRuleId(sessionRules.map((rule) => rule.id))
  const rule = buildInspectorRule({
    ruleId,
    tabId: message.tabId,
    origin: message.origin,
    pathPrefix: message.pathPrefix,
    sessionId: message.sessionId,
    sessionToken: message.sessionToken,
  })

  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds,
    addRules: [rule as chrome.declarativeNetRequest.Rule],
  })

  map[String(message.tabId)] = ruleId
  await setRuleMap(map)

  return { ok: true }
}

async function handleRemoveRule(message: Extract<ExtensionMessage, { type: 'inspector.remove-rule' }>): Promise<ExtensionResponse> {
  const map = await getRuleMap()
  const existingId = map[String(message.tabId)]
  if (existingId) {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [existingId],
    })
    delete map[String(message.tabId)]
    await setRuleMap(map)
  }

  return { ok: true }
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  void (async () => {
    try {
      if (message.type === 'inspector.add-rule') {
        sendResponse(await handleAddRule(message))
        return
      }
      if (message.type === 'inspector.remove-rule') {
        sendResponse(await handleRemoveRule(message))
        return
      }
      sendResponse({ ok: false, error: 'Unknown message type' })
    }
    catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Background error',
      })
    }
  })()
  return true
})
