import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

// Une nouvelle version attend que l'utilisateur choisisse « Mettre à jour » (ou que l'appli soit fermée) :
// plus de rechargement surprise au retour sur l'application après un déploiement.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//] }))

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = typeof payload.title === 'string' ? payload.title : 'Renova OS'
  const options = {
    body: typeof payload.body === 'string' ? payload.body : 'Vous avez une nouvelle notification.',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: typeof payload.tag === 'string' ? payload.tag : 'renova-notification',
    data: { url: typeof payload.url === 'string' ? payload.url : '/app/activite' },
    renotify: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/app/activite', self.location.origin)
  if (target.origin !== self.location.origin) return
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if ('focus' in client) {
        await client.navigate(target.href)
        return client.focus()
      }
    }
    return self.clients.openWindow(target.href)
  })())
})
