import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import type { H3Event } from 'h3'
import type { ResolvedModuleOptions } from '../../types/module'
import { createInstrumentedFetch } from '../../server/services/instrumented-fetch'

interface PluginNuxtApp {
  ssrContext?: {
    event?: H3Event
  }
}

export default defineNuxtPlugin((nuxtApp: PluginNuxtApp) => {
  const config = useRuntimeConfig().ssrNetworkInspector as ResolvedModuleOptions | undefined

  const getEvent = (): H3Event | undefined => {
    return nuxtApp.ssrContext?.event
  }

  const ssrFetch = config?.enabled && config.authToken
    ? createInstrumentedFetch(config, getEvent)
    : $fetch

  return {
    provide: {
      ssrFetch,
    },
  }
})
