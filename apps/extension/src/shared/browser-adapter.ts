import type { AddInspectorRuleMessage, RemoveInspectorRuleMessage } from './messages'

export interface BrowserAdapter {
  getInspectedTabId(): number
  getInspectedOrigin(): Promise<string>
  getInspectedPathname(): Promise<string>
  reloadInspectedWindow(): Promise<void>
  addSessionRule(message: Omit<AddInspectorRuleMessage, 'type'>): Promise<void>
  removeSessionRule(message: Omit<RemoveInspectorRuleMessage, 'type'>): Promise<void>
  getLocalSettings<T>(key: string): Promise<T | undefined>
  setLocalSettings<T>(key: string, value: T): Promise<void>
  removeLocalSettings(key: string): Promise<void>
}

export function createChromeBrowserAdapter(): BrowserAdapter {
  return {
    getInspectedTabId() {
      return chrome.devtools.inspectedWindow.tabId
    },

    getInspectedOrigin() {
      return new Promise((resolve, reject) => {
        chrome.devtools.inspectedWindow.eval(
          'location.origin',
          (result, exceptionInfo) => {
            if (exceptionInfo?.isException || exceptionInfo?.isError) {
              reject(new Error(exceptionInfo.value || 'Failed to read inspected origin'))
              return
            }
            if (typeof result !== 'string' || !result) {
              reject(new Error('Inspected origin is unavailable'))
              return
            }
            resolve(result)
          },
        )
      })
    },

    getInspectedPathname() {
      return new Promise((resolve, reject) => {
        chrome.devtools.inspectedWindow.eval(
          'location.pathname',
          (result, exceptionInfo) => {
            if (exceptionInfo?.isException || exceptionInfo?.isError) {
              reject(new Error(exceptionInfo.value || 'Failed to read inspected pathname'))
              return
            }
            if (typeof result !== 'string' || !result) {
              reject(new Error('Inspected pathname is unavailable'))
              return
            }
            resolve(result)
          },
        )
      })
    },

    reloadInspectedWindow() {
      return new Promise((resolve) => {
        chrome.devtools.inspectedWindow.reload({ ignoreCache: true })
        resolve()
      })
    },

    async addSessionRule(message) {
      const response = await chrome.runtime.sendMessage({
        type: 'inspector.add-rule',
        ...message,
      })
      if (!response?.ok) {
        throw new Error(response?.error || 'Failed to add inspector rule')
      }
    },

    async removeSessionRule(message) {
      const response = await chrome.runtime.sendMessage({
        type: 'inspector.remove-rule',
        ...message,
      })
      if (!response?.ok) {
        throw new Error(response?.error || 'Failed to remove inspector rule')
      }
    },

    async getLocalSettings<T>(key: string): Promise<T | undefined> {
      const result = await chrome.storage.local.get(key)
      return result[key] as T | undefined
    },

    async setLocalSettings<T>(key: string, value: T): Promise<void> {
      await chrome.storage.local.set({ [key]: value })
    },

    async removeLocalSettings(key: string): Promise<void> {
      await chrome.storage.local.remove(key)
    },
  }
}
