self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const title = payload.title || 'Promin Store'
  const options = {
    body: payload.body || 'Нове повідомлення для магазину',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: payload.url || '/',
      target_screen: payload.target_screen || 'messages',
      task_id: payload.task_id || null,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          return client.navigate(targetUrl).then((focusedClient) => focusedClient.focus())
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return undefined
    }),
  )
})
