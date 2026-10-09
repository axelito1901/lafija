/* La Fija · service worker: muestra avisos del sistema (push) y abre la app en el lugar correcto al tocarlos. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', e => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { title: 'La Fija', text: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'La Fija', {
    body: d.text || '', icon: '/favicon.svg', badge: '/favicon.svg', tag: d.id || undefined, data: { link: d.link || '/' },
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = new URL('/#' + ((e.notification.data && e.notification.data.link) || '/'), self.location.origin).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { c.navigate(url); return c.focus() }
    return self.clients.openWindow(url)
  }))
})
