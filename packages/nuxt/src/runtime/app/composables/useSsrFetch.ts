import type { UseFetchOptions } from 'nuxt/app'
import type { Ref } from 'vue'
import { useFetch, useNuxtApp } from '#imports'

export function useSsrFetch<T = unknown>(
  url: string | Ref<string> | (() => string),
  options: UseFetchOptions<T> = {},
) {
  const { $ssrFetch } = useNuxtApp()

  return useFetch(url, {
    ...options,
    $fetch: $ssrFetch as typeof $fetch,
  })
}
