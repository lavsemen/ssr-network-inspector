<script setup lang="ts">
const { apiUrl } = useMockApi()
const { $ssrFetch } = useNuxtApp()

async function safeFetch(path: string) {
  try {
    return {
      ok: true,
      data: await $ssrFetch(apiUrl(path)),
    }
  }
  catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const result = await useAsyncData('errors', () =>
  Promise.all([
    safeFetch('/api/fast'),
    safeFetch('/api/error'),
    safeFetch('/api/not-found'),
  ]),
)
</script>

<template>
  <ScenarioShell
    title="Errors"
    description="404 и 500 должны быть видны в inspector"
  >
    <pre>{{ result.data }}</pre>
  </ScenarioShell>
</template>
