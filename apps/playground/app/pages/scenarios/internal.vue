<script setup lang="ts">
const { $ssrFetch } = useNuxtApp()

const result = await useAsyncData('internal', () =>
  $ssrFetch('/api/internal-demo'),
)
</script>

<template>
  <ScenarioShell
    title="Internal Nitro"
    description="Относительный URL должен иметь transport nitro-local"
  >
    <pre>{{ result.data }}</pre>
  </ScenarioShell>
</template>
