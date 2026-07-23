export type AddInspectorRuleMessage = {
  type: 'inspector.add-rule'
  tabId: number
  origin: string
  pathPrefix?: string
  sessionId: string
  sessionToken: string
}

export type RemoveInspectorRuleMessage = {
  type: 'inspector.remove-rule'
  tabId: number
}

export type ExtensionMessage = AddInspectorRuleMessage | RemoveInspectorRuleMessage

export type ExtensionResponse = {
  ok: boolean
  error?: string
}
