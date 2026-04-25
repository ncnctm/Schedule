var CACHE = 'schedule-v4';
var ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

/* Cache-first for same-origin, network-first for external */
self.addEventListener('fetch', function(e) {
  if (new URL(e.request.url).origin !== location.origin) {
    e.respondWith(fetch(e.request).catch(function() { return caches.match(e.request); }));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fresh = fetch(e.request).then(function(res) {
        if (res && res.status === 200) {
          caches.open(CACHE).then(function(c) { c.put(e.request, res.clone()); });
        }
        return res;
      }).catch(function() { return cached; });
      return cached || fresh;
    })
  );
});

/* Show notification from push event (browser/PWA mode) */
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(ex) { data = { title: '⏰ Reminder', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(data.title || '⏰ Reminder', {
      body: data.body || '',
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: data.tag || 'reminder'
    })
  );
});

/* Schedule a local notification at a specific time */
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'SCHEDULE') {
    var n = e.data.payload;
    var delay = n.fireAt - Date.now();
    if (delay < 0) return;
    setTimeout(function() {
      self.registration.showNotification(n.title || '⏰ Reminder', {
        body: n.body || '',
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        tag: n.tag || 'sched-' + Date.now()
      });
    }, delay);
  }
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
