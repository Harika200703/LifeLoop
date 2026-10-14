
/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  let data = {
    title: 'LifeLoop Reminder',
    body: 'You have something to remember.',
    url: '/',
  }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch {
      data.body = event.data.text() || data.body
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  ).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.focus()
          }
        }

        return self.clients.openWindow(targetUrl)
      })
  )
})
