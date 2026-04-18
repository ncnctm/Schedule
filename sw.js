self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Handle push events (background notifications)
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) { data = { title: '⏰ Reminder', body: e.data ? e.data.text() : 'Task starting soon!' }; }
  e.waitUntil(
    self.registration.showNotification(data.title || '⏰ Reminder', {
      body: data.body || '',
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'reminder',
      renotify: true,
      requireInteraction: true,
      actions: [{ action: 'open', title: 'Open Schedule' }]
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(function(list) {
    if (list.length > 0) return list[0].focus();
    return clients.openWindow('/');
  }));
});

// Periodic background sync to check reminders
self.addEventListener('periodicsync', function(e) {
  if (e.tag === 'check-reminders') {
    e.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  // Clients will handle the actual reminder logic via postMessage
  const allClients = await self.clients.matchAll();
  allClients.forEach(c => c.postMessage({ type: 'CHECK_REMINDERS' }));
}
