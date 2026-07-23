<script setup lang="ts">
import type { RequestViewModel, TraceViewModel } from '../stores/inspector-store'
import { computeWaterfall } from '../utils/waterfall'
import { formatDuration, formatSize, statusTone, transportLabel } from '../utils/format'

const props = defineProps<{
  requests: RequestViewModel[]
  selectedRequestId?: string
  trace?: TraceViewModel
}>()

const emit = defineEmits<{
  select: [requestId: string]
}>()

function bar(request: RequestViewModel) {
  const traceStartedAt = props.trace?.startedAt ?? request.startedAt
  const traceDurationMs = props.trace?.durationMs
    ?? Math.max(1, (props.trace?.finishedAt ?? Date.now()) - traceStartedAt)

  return computeWaterfall({
    requestStartedAt: request.startedAt,
    requestDurationMs: request.durationMs,
    traceStartedAt,
    traceDurationMs,
    pending: request.finishedAt === undefined && !request.failed,
  })
}

function statusText(request: RequestViewModel): string {
  if (request.failed && !request.status) {
    return 'Failed'
  }
  if (request.status === undefined) {
    return 'Pending'
  }
  return String(request.status)
}
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Name</th>
          <th>Status</th>
          <th>Type</th>
          <th>Duration</th>
          <th>Size</th>
          <th class="waterfall-cell">
            Waterfall
            <div class="scale">
              <span>0 ms</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="request in requests"
          :key="request.id"
          :class="{ selected: request.id === selectedRequestId }"
          @click="emit('select', request.id)"
        >
          <td>{{ request.method }}</td>
          <td class="name-cell">
            <span class="name-main">{{ request.pathname }}</span>
            <span v-if="request.query" class="name-query">
              ?{{ Object.entries(request.query).map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : value}`).join('&') }}
            </span>
          </td>
          <td :class="`status-${statusTone(request.status, request.failed)}`">
            {{ statusText(request) }}
          </td>
          <td>{{ transportLabel(request.transport) }}</td>
          <td>{{ formatDuration(request.durationMs) }}</td>
          <td>{{ formatSize(request.bodySize) }}</td>
          <td class="waterfall-cell">
            <div class="waterfall">
              <div
                class="waterfall-bar"
                :class="{
                  error: request.failed || (request.status ?? 0) >= 400,
                  pending: request.finishedAt === undefined && !request.failed,
                }"
                :style="{
                  left: `${bar(request).offsetPercent}%`,
                  width: `${bar(request).widthPercent}%`,
                }"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="requests.length === 0" class="empty">
      No requests recorded yet.
    </div>
  </div>
</template>
