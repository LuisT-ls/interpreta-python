/* Offline support for the app shell and assets fetched while online. */
const APP_CACHE = 'interpreta-python-app-v1'
const PYODIDE_CACHE = 'interpreta-python-pyodide-0.26.1-v1'
const APP_SHELL = ['/']
const PYODIDE_RESOURCE = /^https:\/\/cdn\.jsdelivr\.net\/pyodide\/v0\.26\.1\/full\//
const PYTHON_WHEEL = /^https:\/\/files\.pythonhosted\.org\//
const MAX_RUNTIME_ENTRIES = 512

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE)
    await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys
      .filter((key) => key.startsWith('interpreta-python-') && key !== APP_CACHE && key !== PYODIDE_CACHE)
      .map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

async function trimCache(cache, limit) {
  const keys = await cache.keys()
  if (keys.length <= limit) return
  await Promise.all(keys.slice(0, keys.length - limit).map((request) => cache.delete(request)))
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok || response.type === 'opaque') {
      await cache.put(request, response.clone())
      if (cacheName === PYODIDE_CACHE) await trimCache(cache, MAX_RUNTIME_ENTRIES)
    }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (PYODIDE_RESOURCE.test(url.href) || PYTHON_WHEEL.test(url.href)) {
    event.respondWith(networkFirst(request, PYODIDE_CACHE).catch(() => Response.error()))
    return
  }

  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, APP_CACHE).catch(async () => {
      const cached = await caches.match('/')
      return cached || Response.error()
    }))
    return
  }

  if (url.pathname.startsWith('/_next/static/') || request.destination === 'font' || request.destination === 'image') {
    event.respondWith(networkFirst(request, APP_CACHE).catch(async () => {
      const cached = await caches.match(request)
      return cached || Response.error()
    }))
  }
})
