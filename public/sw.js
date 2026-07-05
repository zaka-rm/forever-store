// Minimal service worker: enables "add to home screen" (installable PWA) and a
// basic offline fallback. Network-first, so online visitors always get fresh
// content — the cache is only used when the network is unavailable.
const CACHE = 'forever-v1'
const SHELL = ['/', '/index.html', '/favicon.svg']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Keep the app shell fresh for offline use.
        if (request.mode === 'navigate') {
          const copy = response.clone()
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {})
        }
        return response
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
  )
})
