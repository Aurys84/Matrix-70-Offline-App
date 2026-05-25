// A './' helyett használd a teljes útvonalat:
const CACHE_NAME = 'matrix-70-offline-v2'; // <--- ÁTÍRTAM v2-re, hogy a telefon kötelezően frissítsen!
const urlsToCache = [
  '/Matrix--70-App/',
  '/Matrix--70-App/index.html',
  '/Matrix--70-App/database.js',
  '/Matrix--70-App/manifest.json',
  '/Matrix--70-App/store_icon.png'
];

// 1. Telepítés: Abszolút útvonalakkal égetjük be
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Mátrix Labor v2: Offline cache kiépítve!');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Aktiválás: A régi v1-es szemetet takarítjuk
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Mátrix Labor: Régi cache törölve:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Golyóálló Fetch (Adatbázis prioritással)
self.addEventListener('fetch', event => {
  // 1. Speciális kezelés a database.js-nek (kényszerített cache)
  if (event.request.url.includes('database.js')) {
    event.respondWith(
      caches.match('/Matrix--70-App/database.js').then(response => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // 2. Általános Cache-First stratégia
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          let responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
          console.log('Mátrix Labor: Offline mód - hálózati erőforrás nem elérhető.');
        });
      })
  );
});

// --- Értesítési Logika ---
self.addEventListener('push', function(event) {
    let data = { title: 'Mátrix Labor', body: 'Rendszerüzenet érkezett!' };
    if (event.data) {
        try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
    }
    const options = {
        body: data.body,
        icon: '/Matrix--70-App/store_icon.png',
        badge: '/Matrix--70-App/store_icon.png',
        vibrate: [200, 100, 200],
        data: { url: self.registration.scope }
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let client of clientList) {
                if (client.url === event.notification.data.url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(event.notification.data.url);
        })
    );
});
// --- Értesítési Logika END ---
