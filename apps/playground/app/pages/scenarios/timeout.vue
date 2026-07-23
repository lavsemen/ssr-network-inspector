<script setup lang="ts">
const { apiUrl } = useMockApi()
const { $ssrFetch } = useNuxtApp()

const result = await useAsyncData('timeout', async () => {
  try {
    const data = await $ssrFetch(apiUrl('/api/timeout'), {
      timeout: 1000,
    })
    return { ok: true, data }
  }
  catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
})
</script>

<template>
  <ScenarioShell
    title="Timeout"
    description="Запрос с timeout ~1000ms к /api/timeout"
  >
    <pre>{{ result.data }}</pre>
  </ScenarioShell>
</template>
