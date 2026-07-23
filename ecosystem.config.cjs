module.exports = {
  apps: [
    {
      name: 'ssr-ni-mock-api',
      cwd: '/var/www/ssr-network-inspector/apps/mock-api',
      script: '../../node_modules/tsx/dist/cli.mjs',
      args: 'src/server.ts',
      interpreter: 'node',
      env: {
        PORT: '4010',
        NODE_ENV: 'production',
      },
    },
    {
      name: 'ssr-ni-playground',
      cwd: '/var/www/ssr-network-inspector/apps/playground',
      script: '.output/server/index.mjs',
      interpreter: 'node',
      env: {
        HOST: '127.0.0.1',
        PORT: '3010',
        NODE_ENV: 'production',
        NITRO_HOST: '127.0.0.1',
        NITRO_PORT: '3010',
        NUXT_APP_BASE_URL: '/playgrounds/ssr-network-inspector/',
        NUXT_SSR_INSPECTOR_TOKEN: 'dev-secret',
        NUXT_PUBLIC_MOCK_API_URL: 'https://epicplan.ru/playgrounds/ssr-network-inspector-api',
        NUXT_MOCK_API_INTERNAL_URL: 'http://127.0.0.1:4010',
      },
    },
  ],
}
