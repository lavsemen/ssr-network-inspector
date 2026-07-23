<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const generatedAt = useState(`ssr-generated-${route.path}`, () => new Date().toISOString())

const reloadHref = computed(() => {
  const base = String(runtimeConfig.app.baseURL || '/').replace(/\/$/, '')
  return `${base}${route.fullPath}`
})
</script>

<template>
  <section class="panel">
    <h1>{{ title }}</h1>
    <p v-if="description" class="meta">
      {{ description }}
    </p>
    <p class="meta">
      SSR generated at: {{ generatedAt }}
    </p>
    <div class="actions">
      <a class="button primary" :href="reloadHref">
        Open with full reload
      </a>
      <NuxtLink class="button" to="/">
        Back to home
      </NuxtLink>
    </div>
    <div style="margin-top: 1.25rem;">
      <slot />
    </div>
  </section>
</template>
