<script setup lang="ts">
const { apiUrl } = useMockApi()
const { $ssrFetch } = useNuxtApp()

const { data } = await useAsyncData('basic-scenario', () =>
  Promise.all([
    $ssrFetch(apiUrl('/api/fast')),
    $ssrFetch(apiUrl('/api/slow')),
    $ssrFetch(apiUrl('/api/users/1')),
  ]),
)
</script>

<template>
  <ScenarioShell
    title="Basic"
    description="Параллельные SSR-запросы: fast, slow, users/1"
  >
    <pre>{{ data }}</pre>
  </ScenarioShell>
</template>
