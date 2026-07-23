import {
  addImports,
  addPlugin,
  addServerHandler,
  addServerPlugin,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'
import { defu } from 'defu'
import type { ModuleOptions, ResolvedModuleOptions } from './runtime/types/module'
import { DEFAULT_MODULE_OPTIONS, resolveModuleOptions } from './runtime/shared/defaults'

export type { ModuleOptions } from './runtime/types/module'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@ssr-network-inspector/nuxt',
    configKey: 'ssrNetworkInspector',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {
    ...DEFAULT_MODULE_OPTIONS,
    authToken: undefined,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const resolved = resolveModuleOptions(options)
    const isDev = nuxt.options.dev || process.env.NODE_ENV !== 'production'

    if (resolved.enabled && !resolved.authToken) {
      if (isDev) {
        console.warn(
          '[ssr-network-inspector] enabled=true but authToken is missing. '
          + 'Set ssrNetworkInspector.authToken or NUXT_SSR_INSPECTOR_TOKEN. '
          + 'Inspector endpoints will not be registered.',
        )
      }
      resolved.enabled = false
    }

    const runtimeEnabled = Boolean(resolved.enabled && resolved.authToken)

    nuxt.options.runtimeConfig.ssrNetworkInspector = defu(
      nuxt.options.runtimeConfig.ssrNetworkInspector as Partial<ResolvedModuleOptions> | undefined,
      resolved,
      { enabled: runtimeEnabled },
    )

    addPlugin(resolver.resolve('./runtime/app/plugins/ssr-fetch.server'))
    addPlugin(resolver.resolve('./runtime/app/plugins/ssr-fetch.client'))
    addImports({
      name: 'useSsrFetch',
      from: resolver.resolve('./runtime/app/composables/useSsrFetch'),
    })

    addTypeTemplate({
      filename: 'types/ssr-network-inspector.d.ts',
      getContents: () => `import type { $Fetch } from 'ofetch'
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
`,
    })

    if (!runtimeEnabled) {
      return
    }

    const prefix = resolved.routePrefix.replace(/\/$/, '')

    addServerPlugin(resolver.resolve('./runtime/server/plugins/nitro-lifecycle'))

    addServerHandler({
      middleware: true,
      handler: resolver.resolve('./runtime/server/middleware/inspector-context'),
    })

    addServerHandler({
      route: `${prefix}/health`,
      handler: resolver.resolve('./runtime/server/routes/health.get'),
    })

    addServerHandler({
      route: `${prefix}/sessions`,
      method: 'post',
      handler: resolver.resolve('./runtime/server/routes/sessions.post'),
    })

    addServerHandler({
      route: `${prefix}/sessions/:id/events`,
      method: 'get',
      handler: resolver.resolve('./runtime/server/routes/sessions/[id]/events.get'),
    })

    addServerHandler({
      route: `${prefix}/sessions/:id`,
      method: 'delete',
      handler: resolver.resolve('./runtime/server/routes/sessions/[id].delete'),
    })
  },
})
