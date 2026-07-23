<script setup lang="ts">
const { apiUrl } = useMockApi()
const { $ssrFetch } = useNuxtApp()

const { data } = await useAsyncData('large-scenario', () =>
  $ssrFetch<{ items: unknown[] }>(apiUrl('/api/large')),
)

const itemCount = computed(() => (Array.isArray(data.value?.items) ? data.value.items.length : 0))
</script>

<template>
  <ScenarioShell
    title="Large response"
    description="Большой JSON; preview должен обрезаться"
  >
    <p class="meta">
      Items: {{ itemCount }}
    </p>
  </ScenarioShell>
</template>
