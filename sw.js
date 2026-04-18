var CACHE='schedule-v2';
var ASSETS=['/','/index.html'];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){return c.addAll(ASSETS);}).then(function(){return self.skipWaiting();})
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});

/* Cache-first for same-origin, network-first for fonts/external */
self.addEventListener('fetch',function(e){
  var url=new URL(e.request.url);
  if(url.origin!==location.origin){
    // network-first for external (fonts, weather API)
    e.respondWith(fetch(e.request).catch(function(){return caches.match(e.request);}));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var fresh=fetch(e.request).then(function(res){
        if(res&&res.status===200){
          var clone=res.clone();
          caches.open(CACHE).then(function(c){c.put(e.request,clone);});
        }
        return res;
      }).catch(function(){return cached;});
      return cached||fresh;
    })
  );
});

self.addEventListener('message',function(e){
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
});

/* Push notifications */
self.addEventListener('push',function(e){
  var data={};
  try{data=e.data.json();}catch(ex){data={title:'⏰ Reminder',body:e.data?e.data.text():'Task starting soon!'};}
  e.waitUntil(
    self.registration.showNotification(data.title||'⏰ Reminder',{
      body:data.body||'',icon:'/icon.png',vibrate:[200,100,200],
      tag:data.tag||'reminder',renotify:true,requireInteraction:true
    })
  );
});

self.addEventListener('notificationclick',function(e){
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(function(list){
    if(list.length>0)return list[0].focus();
    return clients.openWindow('/');
  }));
});
