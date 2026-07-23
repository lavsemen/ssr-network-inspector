# SSR Network Inspector

Chrome DevTools не видит backend-запросы, которые Nuxt выполняет на сервере во время SSR.  
**SSR Network Inspector** решает это: Nuxt-модуль перехватывает `$ssrFetch` / `useSsrFetch`, публикует события по SSE, а Chrome extension показывает их во вкладке `SSR Network`.

## Архитектура

```text
Chrome DevTools Extension
        ↕
Inspector API + SSE
        ↕
Nuxt/Nitro Module
        ↕
Backend API
```

Поток:

1. Extension создаёт debug-сессию и подключается к SSE.
2. DNR добавляет headers только к `main_frame` текущей вкладки.
3. Nuxt middleware валидирует сессию и открывает SSR trace.
4. `$ssrFetch` / `useSsrFetch` публикуют request events.
5. Panel показывает таблицу, waterfall и details.

## Быстрый запуск

```bash
pnpm install
pnpm build:module
pnpm dev
```

После старта:

- Playground: http://localhost:3000/scenarios/mixed
- Mock API: http://localhost:4001/health
- Extension dist: `apps/extension/dist`
- Inspector token: `dev-secret`

## Установка extension

1. Открыть `chrome://extensions`
2. Включить Developer mode
3. Нажать Load unpacked
4. Выбрать `apps/extension/dist`
5. Открыть http://localhost:3000
6. Открыть DevTools
7. Перейти в `SSR Network`
8. Указать `dev-secret`
9. Нажать Start recording

> Для Chrome Web Store production-версия должна перейти с широких `host_permissions` на optional host permissions.

## Установка npm-пакета

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@ssr-network-inspector/nuxt'],

  ssrNetworkInspector: {
    enabled: true,
    authToken: process.env.NUXT_SSR_INSPECTOR_TOKEN,
  },
})
```

```env
NUXT_SSR_INSPECTOR_TOKEN=dev-secret
NUXT_PUBLIC_MOCK_API_URL=http://localhost:4001
```

## Использование

```ts
const { data } = await useSsrFetch('/api/users')
```

```ts
const { $ssrFetch } = useNuxtApp()

const result = await $ssrFetch('https://api.example.com/data')
```

MVP видит **только** запросы через `$ssrFetch` и `useSsrFetch`.

## Команды

```bash
pnpm dev
pnpm test
pnpm test:integration
pnpm verify
pnpm build
```

`pnpm verify` выполняет: lint → typecheck → test → integration → build.

## Security

- inspector выключен по умолчанию
- для включения нужен `authToken`
- session короткоживущая (TTL)
- session data хранится только в памяти процесса
- secrets маскируются (`authorization`, `cookie`, query tokens и т.д.)
- body preview выключен по умолчанию
- не используйте слабый production token
- inspector endpoints нельзя оставлять публичными без авторизации
- CDN может не пропускать debug headers
- multi-instance production потребует shared session store
- session не переживают рестарт сервера (in-memory store)

Admin token никогда не попадает в DNR headers. В navigation headers передаются только:

- `x-ssr-inspector-session`
- `x-ssr-inspector-token` (session token, не admin token)

## Ограничения MVP

- видны только `$ssrFetch` и `useSsrFetch`
- нет Axios / произвольного `fetch` / сторонних SDK
- нет OpenTelemetry
- нет DNS/TCP/TLS timing
- нет source initiator
- нет distributed tracing
- in-memory store работает только внутри одного instance
- CDN cache может не запустить SSR
- SPA navigation не создаёт новый SSR
- production body capture может быть опасен

## Production notes / Roadmap

Для production потребуются:

- Redis или другой shared store
- identity-based access
- audit log
- optional host permissions
- CDN bypass только для авторизованной debug-сессии
- строгий TTL
- rate limiting
- sampling
- OpenTelemetry для автоматического перехвата разных HTTP clients

Архитектура модуля уже отделяет event publishing от HTTP client adapters, чтобы позже подключить OTel без ломки protocol/extension.
