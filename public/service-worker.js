// Nome della cache
const CACHE_NAME = 'staffsync-cache-v1';

// Risorse da salvare nella cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-72x72.svg',
  '/icons/icon-96x96.svg',
  '/icons/icon-128x128.svg',
  '/icons/icon-144x144.svg',
  '/icons/icon-152x152.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-384x384.svg',
  '/icons/icon-512x512.svg',
  '/icons/badge-72x72.svg'
];

// Installazione del service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aperta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Recupero delle risorse
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - restituisci la risposta dalla cache
        if (response) {
          return response;
        }
        
        // Altrimenti, fai la richiesta alla rete
        return fetch(event.request)
          .then(response => {
            // Controlla se abbiamo ricevuto una risposta valida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona la risposta
            const responseToCache = response.clone();
            
            // Aggiungi la risposta alla cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(error => {
            // Se la richiesta fallisce (es. offline), mostra la pagina offline
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            // Per richieste di immagini, usa un'immagine di fallback
            if (event.request.destination === 'image') {
              return caches.match('/icons/icon-192x192.svg');
            }
            
            return new Response('Contenuto non disponibile offline', {
              status: 503,
              statusText: 'Servizio non disponibile'
            });
          });
      })
  );
});

// Gestione delle notifiche push
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Azione al click della notifica
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const url = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Controlla se c'è già una finestra aperta e usa quella
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Altrimenti apri una nuova finestra
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Aggiornamento del service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Cancella le cache obsolete
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});