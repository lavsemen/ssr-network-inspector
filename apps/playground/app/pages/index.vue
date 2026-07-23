<script setup lang="ts">
const { apiUrl, publicApiUrl } = useMockApi()
const runtimeConfig = useRuntimeConfig()
const appBase = String(runtimeConfig.app.baseURL || '/')

const health = await useAsyncData('mock-health', async () => {
  try {
    return await $fetch<{ ok: boolean }>(apiUrl('/health'))
  }
  catch {
    return { ok: false }
  }
})

const scenarios = [
  { path: '/scenarios/basic', title: 'Basic' },
  { path: '/scenarios/parallel', title: 'Parallel' },
  { path: '/scenarios/sequential', title: 'Sequential' },
  { path: '/scenarios/errors', title: 'Errors' },
  { path: '/scenarios/timeout', title: 'Timeout' },
  { path: '/scenarios/duplicate', title: 'Duplicate' },
  { path: '/scenarios/post', title: 'POST' },
  { path: '/scenarios/large', title: 'Large response' },
  { path: '/scenarios/secrets', title: 'Secrets' },
  { path: '/scenarios/internal', title: 'Internal Nitro' },
  { path: '/scenarios/mixed', title: 'Mixed demo' },
]

function fullHref(path: string): string {
  return `${appBase.replace(/\/$/, '')}${path}`
}
</script>

<template>
  <section class="panel">
    <h1>SSR Network Inspector Playground</h1>
    <p>
      Браузер не видит backend-запросы, выполненные во время SSR.
      Этот playground демонстрирует модуль и Chrome DevTools panel.
    </p>

    <p class="meta">
      Mock API status:
      <strong>{{ health.data.value?.ok ? 'online' : 'offline' }}</strong>
      ({{ publicApiUrl('/health') }})
    </p>

    <h2>Инструкция</h2>
    <ol class="list">
      <li>Откройте Chrome DevTools</li>
      <li>Перейдите во вкладку SSR Network</li>
      <li>Укажите inspector token: <code>dev-secret</code></li>
      <li>Нажмите Start recording</li>
      <li>Выберите сценарий или перезагрузите страницу</li>
    </ol>

    <h2>Scenarios</h2>
    <ul class="list">
      <li v-for="scenario in scenarios" :key="scenario.path">
        <NuxtLink :to="scenario.path">
          {{ scenario.title }}
        </NuxtLink>
        ·
        <a :href="fullHref(scenario.path)">full reload</a>
      </li>
    </ul>
  </section>
</template>
