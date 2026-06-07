// Color Game service worker.
//
// Strategy: cache-first for same-origin GETs, falling back to network and
// caching the response. The Vite build emits hashed asset URLs, so we can't
// enumerate every URL up-front; instead we precache the entry shell and let
// runtime caching absorb the rest on first visit.
//
// Bump CACHE_VERSION to force a fresh precache after deploys.

const CACHE_VERSION = 'color-game-v1'
const PRECACHE_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.open(CACHE_VERSION).then(async cache => {
      const cached = await cache.match(request)
      if (cached) return cached
      try {
        const response = await fetch(request)
        if (response.ok && response.type === 'basic') {
          cache.put(request, response.clone())
        }
        return response
      } catch (error) {
        const fallback = await cache.match('/index.html')
        if (fallback) return fallback
        throw error
      }
    }),
  )
})
