import type { $Fetch } from 'ofetch'

declare module '#app' {
  interface NuxtApp {
    $ssrFetch: $Fetch
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $ssrFetch: $Fetch
  }
}

export {}
