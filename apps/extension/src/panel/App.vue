<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { createChromeBrowserAdapter, type BrowserAdapter } from '../shared/browser-adapter'
import { createInspectorStore, getFilteredRequests } from './stores/inspector-store'
import { createRecordingController } from './composables/useRecordingSession'
import ToolbarBar from './components/ToolbarBar.vue'
import SummaryBar from './components/SummaryBar.vue'
import RequestTable from './components/RequestTable.vue'
import RequestDetails from './components/RequestDetails.vue'
import SettingsForm from './components/SettingsForm.vue'

const props = defineProps<{
  browser?: BrowserAdapter
}>()

const browser = props.browser ?? createChromeBrowserAdapter()
const store = createInspectorStore()
const showSettings = ref(true)

const recording = createRecordingController({
  state: store.state,
  browser,
  onEvent: (event) => store.applyEvent(event),
})

const statusLabel = computed(() => {
  switch (store.state.connection.status) {
    case 'idle':
      return 'Idle'
    case 'connecting':
      return 'Connecting'
    case 'recording':
      return 'Recording'
    case 'reconnecting':
      return 'Reconnecting'
    case 'stopped':
      return 'Stopped'
    case 'error':
      return store.state.connection.error?.includes('expired')
        ? 'Session expired'
        : 'Connection error'
    default:
      return 'Idle'
  }
})

const selectedTrace = computed(() =>
  store.state.selectedTraceId ? store.state.traces[store.state.selectedTraceId] : undefined,
)

const requests = computed(() => getFilteredRequests(store.state))

const selectedRequest = computed(() =>
  store.state.selectedRequestId ? store.state.requests[store.state.selectedRequestId] : undefined,
)

const canStart = computed(() =>
  store.state.connection.status === 'idle'
  || store.state.connection.status === 'stopped'
  || store.state.connection.status === 'error',
)

const canStop = computed(() =>
  store.state.connection.status === 'connecting'
  || store.state.connection.status === 'recording'
  || store.state.connection.status === 'reconnecting',
)

function settingsKey(origin: string): string {
  return `ssr-inspector-settings:${origin}`
}

async function persistSettings(): Promise<void> {
  const origin = store.state.settings.serverOrigin
  if (!origin) {
    return
  }

  const payload = {
    serverOrigin: store.state.settings.serverOrigin,
    routePrefix: store.state.settings.routePrefix,
    pathPrefix: store.state.settings.pathPrefix,
    rememberToken: store.state.settings.rememberToken,
    adminToken: store.state.settings.rememberToken ? store.state.settings.adminToken : '',
    rememberBasicAuth: store.state.settings.rememberBasicAuth,
    basicAuthUsername: store.state.settings.rememberBasicAuth ? store.state.settings.basicAuthUsername : '',
    basicAuthPassword: store.state.settings.rememberBasicAuth ? store.state.settings.basicAuthPassword : '',
  }

  await browser.setLocalSettings(settingsKey(origin), payload)
}

function detectPlaygroundDefaults(pathname: string): { pathPrefix: string, routePrefix: string } | undefined {
  const marker = '/playgrounds/ssr-network-inspector'
  if (!pathname.startsWith(marker)) {
    return undefined
  }
  return {
    pathPrefix: marker,
    routePrefix: `${marker}/__ssr-network-inspector`,
  }
}

onMounted(async () => {
  try {
    const origin = await browser.getInspectedOrigin()
    const pathname = await browser.getInspectedPathname()
    store.state.settings.serverOrigin = origin

    const saved = await browser.getLocalSettings<{
      serverOrigin?: string
      routePrefix?: string
      pathPrefix?: string
      rememberToken?: boolean
      adminToken?: string
      rememberBasicAuth?: boolean
      basicAuthUsername?: string
      basicAuthPassword?: string
    }>(settingsKey(origin))

    if (saved) {
      store.state.settings.serverOrigin = saved.serverOrigin || origin
      store.state.settings.routePrefix = saved.routePrefix || '/__ssr-network-inspector'
      store.state.settings.pathPrefix = saved.pathPrefix || ''
      store.state.settings.rememberToken = Boolean(saved.rememberToken)
      store.state.settings.adminToken = saved.rememberToken ? (saved.adminToken || '') : ''
      store.state.settings.rememberBasicAuth = Boolean(saved.rememberBasicAuth)
      store.state.settings.basicAuthUsername = saved.rememberBasicAuth ? (saved.basicAuthUsername || '') : ''
      store.state.settings.basicAuthPassword = saved.rememberBasicAuth ? (saved.basicAuthPassword || '') : ''
    }

    const detected = detectPlaygroundDefaults(pathname)
    if (detected) {
      if (!saved?.routePrefix) {
        store.state.settings.routePrefix = detected.routePrefix
      }
      if (!saved?.pathPrefix) {
        store.state.settings.pathPrefix = detected.pathPrefix
      }
    }

    if (!store.state.settings.adminToken && /^(http:\/\/localhost|http:\/\/127\.0\.0\.1)/.test(origin)) {
      store.state.settings.adminToken = 'dev-secret'
    }
  }
  catch (error) {
    store.state.connection.status = 'error'
    store.state.connection.error = error instanceof Error ? error.message : 'Failed to initialize panel'
  }
})

watch(
  () => ({ ...store.state.settings }),
  () => {
    void persistSettings()
  },
  { deep: true },
)

async function onStart() {
  await recording.start(true)
}

async function onStop() {
  await recording.stop(true)
}

async function onReload() {
  if (canStart.value) {
    await recording.start(true)
    return
  }
  await browser.reloadInspectedWindow()
}
</script>

<template>
  <div class="app">
    <ToolbarBar
      :status="statusLabel"
      :preserve-log="store.state.preserveLog"
      :query="store.state.filters.query"
      :can-start="canStart"
      :can-stop="canStop"
      @start="onStart"
      @stop="onStop"
      @reload="onReload"
      @clear="store.clear()"
      @toggle-settings="showSettings = !showSettings"
      @update:preserve-log="store.state.preserveLog = $event"
      @update:query="store.state.filters.query = $event"
    />

    <SettingsForm
      v-if="showSettings"
      :settings="store.state.settings"
      @update:settings="Object.assign(store.state.settings, $event)"
    />

    <p v-if="store.state.connection.error" class="error-banner empty">
      {{ store.state.connection.error }}
    </p>

    <SummaryBar :trace="selectedTrace" :requests="requests" />

    <RequestTable
      :requests="requests"
      :selected-request-id="store.state.selectedRequestId"
      :trace="selectedTrace"
      @select="store.state.selectedRequestId = $event"
    />

    <RequestDetails :request="selectedRequest" />
  </div>
</template>
