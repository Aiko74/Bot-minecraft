self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('msa-shell-v1').then(cache => cache.addAll([
      '/',
      '/index.html',
      '/styles.css',
      '/app.js',
      '/manifest.json'
    ]))
  )
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})
