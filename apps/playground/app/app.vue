<template>
  <div class="layout">
    <header class="header">
      <NuxtLink to="/" class="brand">
        SSR Network Inspector
      </NuxtLink>
      <nav class="nav">
        <NuxtLink to="/scenarios/basic">Basic</NuxtLink>
        <NuxtLink to="/scenarios/mixed">Mixed</NuxtLink>
        <NuxtLink to="/scenarios/errors">Errors</NuxtLink>
      </nav>
    </header>
    <main class="main">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
:root {
  color-scheme: light dark;
  --bg: #f4f6f8;
  --panel: #ffffff;
  --text: #15202b;
  --muted: #5b6b7c;
  --accent: #0b6bcb;
  --border: #d7dee7;
  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f141a;
    --panel: #171d25;
    --text: #e8eef5;
    --muted: #9aa8b7;
    --accent: #6db3ff;
    --border: #2a3441;
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: radial-gradient(circle at top left, #dcecff 0%, var(--bg) 45%);
  color: var(--text);
}

@media (prefers-color-scheme: dark) {
  body {
    background: radial-gradient(circle at top left, #1a2740 0%, var(--bg) 50%);
  }
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.layout {
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
}

.brand {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text);
}

.nav {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.main {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
}

.meta {
  color: var(--muted);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
}

.button.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.list {
  display: grid;
  gap: 0.5rem;
  padding-left: 1.2rem;
}

pre {
  overflow: auto;
  background: color-mix(in srgb, var(--bg) 70%, var(--panel));
  padding: 0.75rem;
  border-radius: 8px;
}
</style>
