# @lavsemen/ssr-network-inspector

Nuxt module for inspecting SSR/backend fetches from Chrome DevTools.

## Install

```bash
npm i @lavsemen/ssr-network-inspector
# or
yarn add @lavsemen/ssr-network-inspector
# or
pnpm add @lavsemen/ssr-network-inspector
```

## Setup

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@lavsemen/ssr-network-inspector'],
  ssrNetworkInspector: {
    enabled: process.env.NUXT_SSR_INSPECTOR_ENABLED === 'true',
    authToken: process.env.NUXT_SSR_INSPECTOR_TOKEN,
  },
})
```

Use `$ssrFetch` / `useSsrFetch` (or pass `$fetch: useNuxtApp().$ssrFetch` into your `useFetch` wrapper) so requests are captured during SSR.

## Docs

See the repository README for architecture, extension setup, and security notes.
