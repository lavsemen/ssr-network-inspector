<script setup lang="ts">
const { apiUrl } = useMockApi()
const { $ssrFetch } = useNuxtApp()

const result = await useAsyncData('post', () =>
  $ssrFetch(apiUrl('/api/echo'), {
    method: 'POST',
    body: {
      message: 'hello from ssr',
      nested: { ok: true },
    },
  }),
)
</script>

<template>
  <ScenarioShell
    title="POST"
    description="POST /api/echo с body preview"
  >
    <pre>{{ result.data }}</pre>
  </ScenarioShell>
</template>
