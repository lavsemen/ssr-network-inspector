import { defineNuxtConfig } from 'nuxt/config'

const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: ['@ssr-network-inspector/nuxt'],
  app: {
    baseURL,
  },
  ssrNetworkInspector: {
    enabled: true,
    authToken: process.env.NUXT_SSR_INSPECTOR_TOKEN || 'dev-secret',
    debug: true,
    capture: {
      requestHeaders: true,
      responseHeaders: true,
      requestBodyPreview: true,
      responseBodyPreview: true,
      maxBodyBytes: 2000,
    },
  },
  runtimeConfig: {
    mockApiInternalUrl: process.env.NUXT_MOCK_API_INTERNAL_URL || '',
    public: {
      mockApiUrl: process.env.NUXT_PUBLIC_MOCK_API_URL || 'http://localhost:4001',
    },
  },
  nitro: {
    // Ensure SSR server binds as configured by HOST/PORT in production.
  },
  devtools: { enabled: false },
})
