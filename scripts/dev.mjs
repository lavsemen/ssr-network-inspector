import { spawn } from 'node:child_process'

const children = []

function run(name, command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      NUXT_SSR_INSPECTOR_TOKEN: process.env.NUXT_SSR_INSPECTOR_TOKEN || 'dev-secret',
      NUXT_PUBLIC_MOCK_API_URL: process.env.NUXT_PUBLIC_MOCK_API_URL || 'http://localhost:4001',
    },
  })
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(`[dev] ${name} exited (code=${code}, signal=${signal})`)
    }
  })
  children.push(child)
  return child
}

let shuttingDown = false

function shutdown() {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  for (const child of children) {
    child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(0), 300).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

run('module', 'pnpm', ['--filter', '@lavsemen/ssr-network-inspector', 'dev'])
run('api', 'pnpm', ['--filter', '@lavsemen/ssr-network-inspector-mock-api', 'dev'])
run('playground', 'pnpm', ['--filter', '@lavsemen/ssr-network-inspector-playground', 'dev'])
run('extension', 'pnpm', ['--filter', '@lavsemen/ssr-network-inspector-extension', 'dev'])

setTimeout(() => {
  console.log(`
SSR Network Inspector development environment is ready.

Playground:
http://localhost:3000/scenarios/mixed

Mock API:
http://localhost:4001/health

Chrome extension:
Load unpacked extension from:
apps/extension/dist

Inspector token:
dev-secret
`)
}, 4000).unref()
