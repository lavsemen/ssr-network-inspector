import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['../../../src/module'],
  ssrNetworkInspector: {
    enabled: true,
    authToken: 'dev-secret',
    debug: true,
  },
})
