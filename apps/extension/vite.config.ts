import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

function extensionAssetsPlugin() {
  return {
    name: 'extension-assets',
    closeBundle() {
      const dist = resolve(__dirname, 'dist')
      mkdirSync(dist, { recursive: true })

      const manifest = JSON.parse(
        readFileSync(resolve(__dirname, 'src/manifest.json'), 'utf8'),
      ) as Record<string, unknown>
      writeFileSync(resolve(dist, 'manifest.json'), JSON.stringify(manifest, null, 2))

      const iconsSource = resolve(__dirname, 'public/icons')
      if (existsSync(iconsSource)) {
        cpSync(iconsSource, resolve(dist, 'icons'), { recursive: true })
      }

      // Ensure standalone SW/devtools entry filenames exist at dist root.
      const backgroundSource = resolve(dist, 'background.js')
      if (!existsSync(backgroundSource)) {
        // Vite may emit under assets depending on config; normalize known outputs.
      }

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>SSR Network DevTools</title>
  </head>
  <body>
    <script type="module" src="./devtools.js"></script>
  </body>
</html>
`
      writeFileSync(resolve(dist, 'devtools.html'), html)
    },
  }
}

export default defineConfig({
  plugins: [vue(), extensionAssetsPlugin()],
  publicDir: false,
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        devtools: resolve(__dirname, 'src/devtools/index.ts'),
        panel: resolve(__dirname, 'panel.html'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background' || chunk.name === 'devtools') {
            return '[name].js'
          }
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
