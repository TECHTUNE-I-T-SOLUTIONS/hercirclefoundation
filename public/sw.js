/* Service Worker for push notifications */
self.addEventListener('push', function (event) {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'Notification', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Her Circle'
  const options = {
    body: data.body || '',
    data: data.url || '/',
    icon: '/logo.png',
    badge: '/logo.png',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data || '/'
  event.waitUntil(clients.matchAll({ type: 'window' }).then((windowClients) => {
    for (let client of windowClients) {
      if (client.url === url && 'focus' in client) return client.focus()
    }
    if (clients.openWindow) return clients.openWindow(url)
  }))
})
