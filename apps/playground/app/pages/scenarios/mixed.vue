<script setup lang="ts">
const { apiUrl } = useMockApi()
const { $ssrFetch } = useNuxtApp()

async function safeFetch(path: string, options?: Parameters<typeof $ssrFetch>[1]) {
  try {
    return {
      ok: true as const,
      data: await $ssrFetch(apiUrl(path), options),
    }
  }
  catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const result = await useAsyncData('mixed', async () => {
  const [fast, slow, errorResult, internal, duplicate, post] = await Promise.all([
    $ssrFetch(apiUrl('/api/fast')),
    $ssrFetch(apiUrl('/api/slow')),
    safeFetch('/api/error'),
    $ssrFetch('/api/internal-demo'),
    Promise.all([
      $ssrFetch(apiUrl('/api/users/1')),
      $ssrFetch(apiUrl('/api/users/1')),
    ]),
    $ssrFetch(apiUrl('/api/echo'), {
      method: 'POST',
      body: { scenario: 'mixed' },
    }),
  ])

  const sequentialFirst = await $ssrFetch(apiUrl('/api/users/2'))
  const sequentialSecond = await $ssrFetch(apiUrl('/api/fast'))

  return {
    fast,
    slow,
    errorResult,
    internal,
    duplicate,
    post,
    sequential: [sequentialFirst, sequentialSecond],
  }
})
</script>

<template>
  <ScenarioShell
    title="Mixed"
    description="Главный демонстрационный сценарий"
  >
    <pre>{{ result.data }}</pre>
  </ScenarioShell>
</template>
