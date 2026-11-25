/* 鲸时 · 离线缓存 Service Worker
 * 仅缓存本应用的静态资源，不涉及任何网络数据上传。
 */
const CACHE = 'whale-work-assistant-v4'
const CORE = ['./', './index.html', './icon.svg', './manifest.webmanifest']

async function precache() {
  const cache = await caches.open(CACHE)
  await cache.addAll(CORE).catch(() => undefined)
  try {
    const response = await fetch('./index.html', { cache: 'no-cache' })
    if (!response.ok) return
    const html = await response.text()
    const matches = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
    const assets = [...new Set(matches.map((match) => new URL(match[1], self.registration.scope).href))]
    await Promise.all(assets.map((asset) => cache.add(asset).catch(() => undefined)))
  } catch {
    // 首次安装时网络不可用也没关系，后续请求会自动补齐缓存
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy)).catch(() => undefined)
          return response
        })
        .catch(() =>
          caches.match('./index.html').then((cached) => cached || caches.match('./') || caches.match(new URL('./index.html', self.registration.scope).href)),
        ),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined)
        }
        return response
      })
    }),
  )
})
