<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RequestViewModel } from '../stores/inspector-store'
import { formatDuration, formatPreview, formatSize } from '../utils/format'

const props = defineProps<{
  request?: RequestViewModel
}>()

const tab = ref<'general' | 'req-headers' | 'req-body' | 'res-headers' | 'response' | 'timing' | 'raw'>('general')

const requestHeadersText = computed(() =>
  formatPreview(props.request?.requestHeaders, 'No request headers captured'),
)
const requestBodyText = computed(() =>
  formatPreview(props.request?.requestBodyPreview, 'No request body preview'),
)
const responseHeadersText = computed(() =>
  formatPreview(props.request?.responseHeaders, 'No response headers captured'),
)
const responseBodyText = computed(() =>
  formatPreview(props.request?.responseBodyPreview, 'No response body preview'),
)
const rawEventsText = computed(() =>
  formatPreview(props.request?.rawEvents, 'No raw events'),
)
</script>

<template>
  <div v-if="request" class="details">
    <div class="tabs">
      <button type="button" class="tab" :class="{ active: tab === 'general' }" @click="tab = 'general'">
        General
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'req-headers' }" @click="tab = 'req-headers'">
        Request headers
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'req-body' }" @click="tab = 'req-body'">
        Request body
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'res-headers' }" @click="tab = 'res-headers'">
        Response headers
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'response' }" @click="tab = 'response'">
        Response
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'timing' }" @click="tab = 'timing'">
        Timing
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'raw' }" @click="tab = 'raw'">
        Raw event
      </button>
    </div>

    <dl v-if="tab === 'general'" class="kv">
      <dt>Request URL</dt><dd>{{ request.url }}</dd>
      <dt>Method</dt><dd>{{ request.method }}</dd>
      <dt>Status</dt><dd>{{ request.failed && !request.status ? 'Failed' : (request.status ?? 'Pending') }}</dd>
      <dt>Transport</dt><dd>{{ request.transport }}</dd>
      <dt>Trace ID</dt><dd>{{ request.traceId }}</dd>
      <dt>Request ID</dt><dd>{{ request.id }}</dd>
      <dt>Started</dt><dd>{{ new Date(request.startedAt).toISOString() }}</dd>
      <dt>Duration</dt><dd>{{ formatDuration(request.durationMs) }}</dd>
      <dt>Size</dt><dd>{{ formatSize(request.bodySize) }}</dd>
      <dt v-if="request.errorMessage">Error</dt>
      <dd v-if="request.errorMessage">{{ request.errorName }}: {{ request.errorMessage }}</dd>
    </dl>

    <pre v-else-if="tab === 'req-headers'" class="code">{{ requestHeadersText }}</pre>
    <pre v-else-if="tab === 'req-body'" class="code">{{ requestBodyText }}</pre>
    <pre v-else-if="tab === 'res-headers'" class="code">{{ responseHeadersText }}</pre>
    <pre v-else-if="tab === 'response'" class="code">{{ responseBodyText }}</pre>

    <dl v-else-if="tab === 'timing'" class="kv">
      <dt>Queueing</dt><dd>unavailable</dd>
      <dt>DNS</dt><dd>unavailable</dd>
      <dt>TCP</dt><dd>unavailable</dd>
      <dt>TLS</dt><dd>unavailable</dd>
      <dt>Waiting for server response</dt><dd>unavailable</dd>
      <dt>Total</dt><dd>{{ formatDuration(request.durationMs) }}</dd>
    </dl>
    <p v-if="tab === 'timing'" class="meta">
      Detailed network phases are not available in MVP.
      Only total server request duration is recorded.
    </p>

    <pre v-else class="code">{{ rawEventsText }}</pre>
  </div>
  <div v-else class="empty">
    Select a request to inspect details.
  </div>
</template>
