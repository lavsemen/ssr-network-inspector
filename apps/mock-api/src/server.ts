import {
  createApp,
  createError,
  createRouter,
  defineEventHandler,
  getRouterParam,
  readBody,
  setResponseHeader,
  setResponseStatus,
  toNodeListener,
} from 'h3'
import { listen } from 'listhen'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const app = createApp()
const router = createRouter()

router.get(
  '/health',
  defineEventHandler(() => ({ ok: true })),
)

router.get(
  '/api/fast',
  defineEventHandler(async () => {
    await delay(randomBetween(40, 80))
    return {
      type: 'fast',
      timestamp: Date.now(),
    }
  }),
)

router.get(
  '/api/slow',
  defineEventHandler(async () => {
    await delay(700)
    return {
      type: 'slow',
      timestamp: Date.now(),
    }
  }),
)

router.get(
  '/api/very-slow',
  defineEventHandler(async () => {
    await delay(2500)
    return {
      type: 'very-slow',
      timestamp: Date.now(),
    }
  }),
)

router.get(
  '/api/error',
  defineEventHandler((event) => {
    setResponseStatus(event, 500)
    return {
      error: 'Intentional test error',
    }
  }),
)

router.get(
  '/api/not-found',
  defineEventHandler(() => {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      data: { error: 'Not found' },
    })
  }),
)

router.get(
  '/api/users/:id',
  defineEventHandler((event) => {
    const id = getRouterParam(event, 'id')
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
    }
  }),
)

router.post(
  '/api/echo',
  defineEventHandler(async (event) => {
    const body = await readBody(event)
    return {
      received: body,
    }
  }),
)

router.get(
  '/api/large',
  defineEventHandler(() => {
    const items = Array.from({ length: 2500 }, (_, index) => ({
      id: index,
      value: `item-${index}-${'x'.repeat(20)}`,
    }))
    return {
      items,
      sizeHint: 'approx-100kb',
    }
  }),
)

router.get(
  '/api/secret',
  defineEventHandler((event) => {
    setResponseHeader(event, 'x-public-value', 'visible')
    setResponseHeader(event, 'set-cookie', 'secret-cookie=value')
    return {
      ok: true,
    }
  }),
)

router.get(
  '/api/timeout',
  defineEventHandler(async () => {
    await delay(10_000)
    return {
      ok: true,
    }
  }),
)

app.use(router)

const port = Number(process.env.PORT || 4001)
const listener = await listen(toNodeListener(app), {
  port,
  hostname: '127.0.0.1',
})

console.log(`[mock-api] listening on ${listener.url}`)

async function shutdown(signal: string): Promise<void> {
  console.log(`[mock-api] shutting down on ${signal}`)
  await listener.close()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})
process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
