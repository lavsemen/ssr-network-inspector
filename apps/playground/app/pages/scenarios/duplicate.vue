<script setup lang="ts">
const { apiUrl } = useMockApi()
const { $ssrFetch } = useNuxtApp()

const result = await useAsyncData('duplicate', () =>
  Promise.all([
    $ssrFetch(apiUrl('/api/users/1')),
    $ssrFetch(apiUrl('/api/users/1')),
  ]),
)
</script>

<template>
  <ScenarioShell
    title="Duplicate"
    description="Два одинаковых URL должны дать два разных requestId"
  >
    <pre>{{ result.data }}</pre>
  </ScenarioShell>
</template>
