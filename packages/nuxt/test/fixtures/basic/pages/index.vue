<script setup lang="ts">
const { $ssrFetch } = useNuxtApp()

const data = await useAsyncData('demo', () =>
  $ssrFetch<{ ok: boolean }>('/api/demo'),
)
</script>

<template>
  <div>
    <h1>Fixture</h1>
    <pre>{{ data.data }}</pre>
  </div>
</template>
