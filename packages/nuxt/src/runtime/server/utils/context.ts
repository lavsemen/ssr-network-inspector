import type { H3Event } from 'h3'
import type { SsrInspectorContext, TraceRequestMeta } from '../../types/module'

const CONTEXT_KEY = '__ssrNetworkInspector'
const REQUEST_META_KEY = '__ssrNetworkInspectorRequestMeta'

export function getInspectorContext(event: H3Event): SsrInspectorContext | undefined {
  return (event.context as Record<string, unknown>)[CONTEXT_KEY] as SsrInspectorContext | undefined
}

export function setInspectorContext(event: H3Event, context: SsrInspectorContext): void {
  ;(event.context as Record<string, unknown>)[CONTEXT_KEY] = context
}

export function getRequestMeta(ctx: unknown): TraceRequestMeta | undefined {
  if (!ctx || typeof ctx !== 'object') {
    return undefined
  }
  return (ctx as Record<string, unknown>)[REQUEST_META_KEY] as TraceRequestMeta | undefined
}

export function setRequestMeta(ctx: object, meta: TraceRequestMeta): void {
  ;(ctx as Record<string, unknown>)[REQUEST_META_KEY] = meta
}
