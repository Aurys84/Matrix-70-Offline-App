const CACHE_NAME = 'matrix-70-offline-v1';
const urlsToCache = [
  './',
  './index.html',
  './database.js',
  './manifest.json',
  './store_icon.png'
];

// 1. Telepítés és a fájlok kőkemény beégetése a telefon belső tárhelyére
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Mátrix Labor: Offline cache kiépítve!');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Azonnali aktiválásra kényszerítjük
  );
});

// 2. Régi verziók kíméletlen takarítása aktiváláskor
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
    }).then(() => self.clients.claim()) // Azonnal átveszi az irányítást az app felett
  );
});

// 3. Golyóálló Offline Elérési Stratégia (Cache-First)
self.addEventListener('fetch', event => {
  // Csak a sima lekérésekkel foglalkozunk (pl. ne akadjon össze külső API-kkal)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Ha megvan a telefonon (Cache), AZONNAL azt adjuk vissza (Zéró-Késés, Offline működés)
        if (cachedResponse) {
          return cachedResponse;
        }

        // Ha valamiért nincs a gyorsítótárban, csak akkor megyünk ki a hálózatra
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          // Amit a netről lekért, azt is gyorsan elmentjük a jövőre nézve offline-ra
          let responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
          // Ha nincs net ÉS nincs a cache-ben sem (pl. egy új link), akkor sem dobunk hibát
          console.log('Mátrix Labor: Teljes offline mód, hálózati hiba.');
        });
      })
  );
});

// --- Értesítési Logika START ---

self.addEventListener('push', function(event) {
    let data = { title: 'Mátrix Labor', body: 'Rendszerüzenet érkezett!' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: 'store_icon.png', // Átírva a meglévő, cache-elt ikonra!
        badge: 'store_icon.png', // Átírva a meglévő, cache-elt ikonra!
        vibrate: [200, 100, 200],
        data: {
            url: self.registration.scope
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let client of clientList) {
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});

// --- Értesítési Logika END ---