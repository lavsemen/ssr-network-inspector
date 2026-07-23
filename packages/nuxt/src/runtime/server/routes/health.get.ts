import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event).ssrNetworkInspector

  return {
    enabled: Boolean(config?.enabled && config.authToken),
    version: '0.1.0',
  }
})
