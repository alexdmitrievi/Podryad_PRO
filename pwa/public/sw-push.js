// Service Worker для push-уведомлений Подряд PRO

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'Подряд PRO',
      body: event.data.text(),
    };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'podryad-notification',
    data: {
      url: data.url || '/',
    },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' },
    ],
    // Показывать даже если вкладка открыта
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Подряд PRO', options)
  );
});

// Клик по уведомлению — открыть URL
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // Если вкладка уже открыта — фокус на неё
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Иначе — новая вкладка
        return clients.openWindow(url);
      })
  );
});
