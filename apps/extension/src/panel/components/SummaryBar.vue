<script setup lang="ts">
import type { RequestViewModel, TraceViewModel } from '../stores/inspector-store'
import { formatDuration, formatSize } from '../utils/format'

const props = defineProps<{
  trace?: TraceViewModel
  requests: RequestViewModel[]
}>()

const transferred = () =>
  props.requests.reduce((sum, request) => sum + (request.bodySize ?? 0), 0)

const slowest = () => {
  if (!props.trace?.slowestRequestId) {
    return '—'
  }
  const request = props.requests.find((item) => item.id === props.trace?.slowestRequestId)
  return request ? `${request.pathname} (${formatDuration(request.durationMs)})` : props.trace.slowestRequestId
}
</script>

<template>
  <div v-if="trace" class="summary">
    <div class="summary-item">
      <label>SSR page</label>
      <div>{{ trace.pagePathname }}</div>
    </div>
    <div class="summary-item">
      <label>SSR duration</label>
      <div>{{ formatDuration(trace.durationMs) }}</div>
    </div>
    <div class="summary-item">
      <label>Requests</label>
      <div>{{ trace.totalRequests }}</div>
    </div>
    <div class="summary-item">
      <label>Failed</label>
      <div>{{ trace.failedRequests }}</div>
    </div>
    <div class="summary-item">
      <label>Transferred</label>
      <div>{{ formatSize(transferred() || undefined) }}</div>
    </div>
    <div class="summary-item" title="Sum of request durations. Can exceed SSR duration due to parallel requests.">
      <label>Backend total</label>
      <div>{{ formatDuration(trace.totalBackendDurationMs) }}</div>
    </div>
    <div class="summary-item">
      <label>Slowest request</label>
      <div>{{ slowest() }}</div>
    </div>
  </div>
  <div v-else class="empty">
    No SSR trace selected. Start recording and reload a Nuxt page.
  </div>
</template>
