import type { CreateSessionResponse, HealthResponse, InspectorEvent } from '@lavsemen/ssr-network-inspector-protocol'
import type { BrowserAdapter } from '../../shared/browser-adapter'
import type { InspectorPanelState } from '../stores/inspector-store'
import { isAbortError, readSseStream } from '../utils/sse-parser'

function joinUrl(origin: string, path: string): string {
  return `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}

export function createRecordingController(options: {
  state: InspectorPanelState
  browser: BrowserAdapter
  onEvent: (event: InspectorEvent) => void
}) {
  let abortController: AbortController | undefined
  let session: CreateSessionResponse | undefined
  let stoppedByUser = false
  let starting = false
  let readyResolve: (() => void) | undefined
  let readyPromise: Promise<void> | undefined
  let sseLoop: Promise<void> | undefined

  function resetReadyGate(): void {
    readyPromise = new Promise<void>((resolve) => {
      readyResolve = resolve
    })
  }

  async function checkHealth(): Promise<HealthResponse> {
    const response = await fetch(
      joinUrl(options.state.settings.serverOrigin, `${options.state.settings.routePrefix}/health`),
    )
    if (!response.ok) {
      throw new Error(`Health check failed (${response.status})`)
    }
    return response.json() as Promise<HealthResponse>
  }

  async function createSession(): Promise<CreateSessionResponse> {
    const response = await fetch(
      joinUrl(options.state.settings.serverOrigin, `${options.state.settings.routePrefix}/sessions`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.state.settings.adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: `extension-${crypto.randomUUID()}`,
          pageOrigin: options.state.settings.serverOrigin,
        }),
      },
    )

    if (response.status === 401) {
      throw new Error('Invalid inspector admin token')
    }
    if (!response.ok) {
      throw new Error(`Failed to create session (${response.status})`)
    }

    return response.json() as Promise<CreateSessionResponse>
  }

  async function runSseLoop(current: CreateSessionResponse): Promise<void> {
    const delays = [500, 1000, 2000]
    let attempt = 0
    let sawReady = false

    while (!stoppedByUser) {
      try {
        if (attempt > 0) {
          options.state.connection.status = 'reconnecting'
          await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1] ?? 2000))
        }

        abortController = new AbortController()
        const response = await fetch(joinUrl(options.state.settings.serverOrigin, current.eventsUrl), {
          headers: {
            Authorization: `Bearer ${current.sessionToken}`,
            Accept: 'text/event-stream',
          },
          signal: abortController.signal,
        })

        if (!response.ok || !response.body) {
          throw new Error(`SSE connection failed (${response.status})`)
        }

        for await (const chunk of readSseStream(response.body, abortController.signal)) {
          for (const warning of chunk.warnings) {
            options.state.warnings.push(warning)
          }

          for (const event of chunk.events) {
            if (event.type === 'inspector.ready' && !sawReady) {
              sawReady = true
              readyResolve?.()
            }
            options.onEvent(event)
          }
        }

        if (stoppedByUser) {
          return
        }

        attempt += 1
        if (attempt > 3) {
          options.state.connection.status = 'error'
          options.state.connection.error = 'SSE connection lost after 3 reconnect attempts'
          return
        }
      }
      catch (error) {
        if (stoppedByUser || isAbortError(error)) {
          return
        }

        attempt += 1
        if (attempt > 3) {
          options.state.connection.status = 'error'
          options.state.connection.error = error instanceof Error ? error.message : 'SSE connection error'
          return
        }
      }
    }
  }

  async function start(reload = true): Promise<void> {
    if (
      starting
      || options.state.connection.status === 'recording'
      || options.state.connection.status === 'connecting'
    ) {
      return
    }

    starting = true
    stoppedByUser = false
    resetReadyGate()
    options.state.connection.status = 'connecting'
    options.state.connection.error = undefined

    try {
      if (!options.state.settings.serverOrigin) {
        throw new Error('Server origin is required')
      }
      if (!options.state.settings.adminToken) {
        throw new Error('Inspector admin token is required')
      }

      const health = await checkHealth()
      if (!health.enabled) {
        throw new Error('Inspector is disabled on the server')
      }

      session = await createSession()
      options.state.sessions[session.sessionId] = {
        id: session.sessionId,
        expiresAt: session.expiresAt,
      }

      sseLoop = runSseLoop(session)

      await Promise.race([
        readyPromise,
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Timed out waiting for inspector.ready')), 10_000)
        }),
      ])

      const tabId = options.browser.getInspectedTabId()
      await options.browser.addSessionRule({
        tabId,
        origin: options.state.settings.serverOrigin,
        pathPrefix: options.state.settings.pathPrefix,
        sessionId: session.sessionId,
        sessionToken: session.sessionToken,
      })

      options.state.connection.status = 'recording'

      if (reload) {
        await options.browser.reloadInspectedWindow()
      }
    }
    catch (error) {
      options.state.connection.status = 'error'
      options.state.connection.error = error instanceof Error ? error.message : 'Failed to start recording'
      await stop(false)
      throw error
    }
    finally {
      starting = false
    }
  }

  async function stop(deleteSession = true): Promise<void> {
    stoppedByUser = true
    abortController?.abort()
    abortController = undefined

    try {
      await options.browser.removeSessionRule({
        tabId: options.browser.getInspectedTabId(),
      })
    }
    catch {
      // ignore
    }

    if (deleteSession && session) {
      try {
        await fetch(
          joinUrl(
            options.state.settings.serverOrigin,
            `${options.state.settings.routePrefix}/sessions/${session.sessionId}`,
          ),
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${session.sessionToken}`,
            },
          },
        )
      }
      catch {
        // ignore
      }
    }

    session = undefined
    await sseLoop?.catch(() => undefined)
    sseLoop = undefined

    if (options.state.connection.status !== 'error') {
      options.state.connection.status = 'stopped'
    }
  }

  return {
    start,
    stop,
    getSession: () => session,
  }
}
