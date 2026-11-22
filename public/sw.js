/* Service worker do MeusEmpréstimos.
 * Recebe as notificações push (enviadas pelo Firebase Cloud Messaging) mesmo
 * com o app fechado e abre a tela certa ao tocar. Não faz cache de nada:
 * o app continua sempre carregando a versão mais nova do servidor. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { notification: { body: event.data ? event.data.text() : '' } }
  }
  // Formato do FCM: { notification: { title, body, ... }, data: { url, tag } }
  const n = payload.notification || {}
  const data = payload.data || {}
  const title = n.title || data.title || 'MeusEmpréstimos'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: n.body || data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag || undefined,
      renotify: !!data.tag,
      lang: 'pt-BR',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Já tem o app aberto? Usa essa janela em vez de abrir outra.
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(url)
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
