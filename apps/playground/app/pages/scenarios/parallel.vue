<script setup lang="ts">
const { apiUrl } = useMockApi()
const { $ssrFetch } = useNuxtApp()

const result = await useAsyncData('parallel', () =>
  Promise.all([
    $ssrFetch(apiUrl('/api/fast')),
    $ssrFetch(apiUrl('/api/slow')),
    $ssrFetch(apiUrl('/api/users/1')),
    $ssrFetch(apiUrl('/api/users/2')),
  ]),
)
</script>

<template>
  <ScenarioShell
    title="Parallel"
    description="Четыре параллельных запроса через Promise.all"
  >
    <pre>{{ result.data }}</pre>
  </ScenarioShell>
</template>
