<script setup lang="ts">
const { apiUrl } = useMockApi()
const { $ssrFetch } = useNuxtApp()

const result = await useAsyncData('sequential', async () => {
  const first = await $ssrFetch(apiUrl('/api/fast'))
  const second = await $ssrFetch(apiUrl('/api/slow'))
  const third = await $ssrFetch(apiUrl('/api/users/1'))
  return { first, second, third }
})
</script>

<template>
  <ScenarioShell title="Sequential">
    <p class="meta">
      Этот сценарий специально создаёт request waterfall.
    </p>
    <pre>{{ result.data }}</pre>
  </ScenarioShell>
</template>
