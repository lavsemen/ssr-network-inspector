<script setup lang="ts">
const { apiUrl } = useMockApi()
const { $ssrFetch } = useNuxtApp()

const result = await useAsyncData('secrets', () =>
  $ssrFetch(apiUrl('/api/secret?token=secret&page=2'), {
    headers: {
      Authorization: 'Bearer very-secret-token',
      'x-api-key': 'private-key',
      'x-public-header': 'visible',
    },
  }),
)
</script>

<template>
  <ScenarioShell
    title="Secrets"
    description="Проверка redaction headers и query"
  >
    <pre>{{ result.data }}</pre>
  </ScenarioShell>
</template>
