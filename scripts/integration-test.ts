import { spawn, type ChildProcess } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import type { CreateSessionResponse, InspectorEvent } from '@ssr-network-inspector/protocol'
import { isInspectorEvent } from '@ssr-network-inspector/protocol'

const PLAYGROUND = process.env.PLAYGROUND_URL || 'http://127.0.0.1:3000'
const MOCK_API = process.env.MOCK_API_URL || 'http://127.0.0.1:4001'
const TOKEN = process.env.NUXT_SSR_INSPECTOR_TOKEN || 'dev-secret'

const children: ChildProcess[] = []

async function waitForUrl(target: string, timeoutMs = 120_000): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(target)
      if (response.ok || response.status < 500) {
        return
      }
    }
    catch {
      // retry
    }
    await delay(500)
  }
  throw new Error(`Timed out waiting for ${target}`)
}

function start(command: string, args: string[], cwd?: string): ChildProcess {
  const child = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NUXT_SSR_INSPECTOR_TOKEN: TOKEN,
      NUXT_PUBLIC_MOCK_API_URL: MOCK_API,
      PORT: '4001',
    },
  })
  child.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(`[${args.join(' ')}] ${chunk.toString()}`)
  })
  child.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[${args.join(' ')}] ${chunk.toString()}`)
  })
  children.push(child)
  return child
}

async function shutdown(): Promise<void> {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }
  await delay(500)
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGKILL')
    }
  }
}

async function createSession(): Promise<CreateSessionResponse> {
  const response = await fetch(`${PLAYGROUND}/__ssr-network-inspector/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: 'integration-test',
      pageOrigin: PLAYGROUND,
    }),
  })
  if (!response.ok) {
    throw new Error(`session create failed: ${response.status}`)
  }
  return response.json() as Promise<CreateSessionResponse>
}

async function collectEvents(
  session: CreateSessionResponse,
  predicate: (events: InspectorEvent[]) => boolean,
  timeoutMs = 30_000,
): Promise<InspectorEvent[]> {
  const events: InspectorEvent[] = []
  const controller = new AbortController()
  const response = await fetch(`${PLAYGROUND}${session.eventsUrl}`, {
    headers: {
      Authorization: `Bearer ${session.sessionToken}`,
      Accept: 'text/event-stream',
    },
    signal: controller.signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`SSE failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const started = Date.now()

  try {
    while (Date.now() - started < timeoutMs) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const data = part
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('\n')
        if (!data) continue
        try {
          const parsed: unknown = JSON.parse(data)
          if (isInspectorEvent(parsed)) {
            events.push(parsed)
          }
        }
        catch {
          // ignore
        }
      }
      if (predicate(events)) break
    }
  }
  finally {
    controller.abort()
  }

  return events
}

async function main(): Promise<void> {
  start('pnpm', ['--filter', '@ssr-network-inspector/mock-api', 'start'])
  start('pnpm', ['--filter', '@ssr-network-inspector/playground', 'dev'])

  await waitForUrl(`${MOCK_API}/health`)
  await waitForUrl(`${PLAYGROUND}/__ssr-network-inspector/health`)

  const session = await createSession()
  const eventsPromise = collectEvents(
    session,
    (events) =>
      events.some((event) => event.type === 'trace.started')
      && events.some((event) => event.type === 'trace.finished')
      && events.filter((event) => event.type === 'request.started').length >= 5,
  )

  const pageResponse = await fetch(`${PLAYGROUND}/scenarios/mixed`, {
    headers: {
      'x-ssr-inspector-session': session.sessionId,
      'x-ssr-inspector-token': session.sessionToken,
    },
  })

  if (!pageResponse.ok) {
    throw new Error(`mixed page failed: ${pageResponse.status}`)
  }

  const events = await eventsPromise
  const started = events.filter((event) => event.type === 'request.started')
  const finished = events.filter((event) => event.type === 'request.finished')
  const failed = events.filter((event) => event.type === 'request.failed')

  if (!events.some((event) => event.type === 'trace.started')) {
    throw new Error('missing trace.started')
  }
  if (started.length < 5) {
    throw new Error(`expected >=5 backend requests, got ${started.length}`)
  }
  if (!finished.some((event) => event.type === 'request.finished' && event.response.status >= 200 && event.response.status < 400)) {
    throw new Error('missing successful request')
  }
  if (!finished.some((event) => event.type === 'request.finished' && event.response.status === 500)) {
    throw new Error('missing 500 response')
  }
  if (!started.some((event) => event.type === 'request.started' && event.request.transport === 'nitro-local')) {
    throw new Error('missing nitro-local request')
  }

  const userRequests = started.filter(
    (event) => event.type === 'request.started' && event.request.pathname.includes('/api/users/1'),
  )
  const ids = new Set(
    userRequests.map((event) => (event.type === 'request.started' ? event.requestId : '')),
  )
  if (ids.size < 2) {
    throw new Error('expected duplicate URL with different requestIds')
  }

  if (!events.some((event) => event.type === 'trace.finished')) {
    throw new Error('missing trace.finished')
  }

  console.log(`Integration test passed (${started.length} requests, ${failed.length} failed events)`)
}

main()
  .then(async () => {
    await shutdown()
    process.exit(0)
  })
  .catch(async (error: unknown) => {
    console.error(error)
    await shutdown()
    process.exit(1)
  })
