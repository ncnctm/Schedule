var CACHE = 'schedule-v3';
var ASSETS = ['/', '/index.html', '/manifest.json'];

/* ── INSTALL: cache all assets ── */
self.importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
self.importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

/* ── Firebase config — filled in by user ── */
var FIREBASE_CONFIG = {
  apiKey: "REPLACE_API_KEY",
  authDomain: "REPLACE_AUTH_DOMAIN",
  projectId: "REPLACE_PROJECT_ID",
  storageBucket: "REPLACE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_SENDER_ID",
  appId: "REPLACE_APP_ID"
};

try {
  firebase.initializeApp(FIREBASE_CONFIG);
  var messaging = firebase.messaging();

  /* Handle background FCM push messages */
  messaging.onBackgroundMessage(function(payload) {
    var data = payload.data || payload.notification || {};
    self.registration.showNotification(data.title || '⏰ Reminder', {
      body: data.body || '',
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: data.tag || 'reminder-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || '/' }
    });
  });
} catch(e) {
  console.log('Firebase not configured yet');
}

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    e.respondWith(fetch(e.request).catch(function() { return caches.match(e.request); }));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fresh = fetch(e.request).then(function(res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() { return cached; });
      return cached || fresh;
    })
  );
});

/* Manual push from within the page (local scheduling) */
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(ex) { data = { title: '⏰ Reminder', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(data.title || '⏰ Reminder', {
      body: data.body || '',
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: data.tag || 'reminder',
      renotify: true,
      requireInteraction: true
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url && list[i].focus) return list[i].focus();
      }
      return clients.openWindow(e.notification.data && e.notification.data.url ? e.notification.data.url : '/');
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();

  /* Schedule a local notification at a specific time */
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    var n = e.data.payload;
    var delay = n.fireAt - Date.now();
    if (delay < 0) return;
    setTimeout(function() {
      self.registration.showNotification(n.title || '⏰ Reminder', {
        body: n.body || '',
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: n.tag || 'scheduled-' + Date.now(),
        renotify: true,
        requireInteraction: true
      });
    }, delay);
  }
});
