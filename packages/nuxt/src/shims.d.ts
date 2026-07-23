declare module '#imports' {
  export function useRuntimeConfig(event?: unknown): {
    ssrNetworkInspector: import('./runtime/types/module').ResolvedModuleOptions
  }
  export function useFetch(...args: unknown[]): unknown
  export function useNuxtApp(): {
    $ssrFetch: typeof globalThis.$fetch
  }
}

declare module '#app' {
  export function defineNuxtPlugin<T>(
    plugin: (nuxtApp: {
      ssrContext?: {
        event?: import('h3').H3Event
      }
    }) => T,
  ): unknown
  export function useRequestEvent(): import('h3').H3Event | undefined
  export function useRuntimeConfig(): {
    ssrNetworkInspector: import('./runtime/types/module').ResolvedModuleOptions
  }
}

declare const $fetch: typeof import('ofetch').$fetch
