// Nome della cache
const CACHE_NAME = 'davittorino-cache-v2';

// Importa script per la sincronizzazione in background
importScripts('/background-sync.js');

// Risorse statiche da salvare nella cache all'installazione
const STATIC_CACHE_NAME = 'davittorino-static-v2';

// Risorse dinamiche
const DYNAMIC_CACHE_NAME = 'davittorino-dynamic-v2';

// Le risorse essenziali da precaricare
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
  '/icons/badge-72x72.svg',
  '/background-sync.js'
];

// Risorse che richiedono una strategia network-first
const NETWORK_FIRST_URLS = [
  '/api/auth/me',
  '/api/schedules',
  '/api/time-off-requests',
  '/api/documents'
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
  const requestUrl = new URL(event.request.url);
  
  // Verifica se la richiesta è un'API
  const isApiRequest = requestUrl.pathname.startsWith('/api/');
  
  // Verifica se la richiesta dovrebbe usare la strategia network-first
  const isNetworkFirstRequest = NETWORK_FIRST_URLS.some(url => 
    requestUrl.pathname.startsWith(url)
  );
  
  // Non intercettare richieste non GET o richieste in altri domini
  if (event.request.method !== 'GET' || requestUrl.origin !== location.origin) {
    // Per le richieste API POST/PUT/DELETE in caso di offline, 
    // programma la sincronizzazione in background
    if (isApiRequest && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(event.request.method)) {
      // Se il browser è offline, salva la richiesta per sincronizzazione
      if (!navigator.onLine) {
        event.respondWith(
          (async () => {
            try {
              // Crea una copia della richiesta da salvare
              const requestData = {
                url: event.request.url,
                method: event.request.method,
                headers: Object.fromEntries(event.request.headers.entries()),
                body: await event.request.clone().text()
              };
              
              // Determina il tag appropriato per la sincronizzazione
              let syncTag = '';
              if (requestUrl.pathname.includes('time-off')) {
                syncTag = self.backgroundSync.SYNC_TAGS.TIME_OFF_REQUEST;
              } else if (requestUrl.pathname.includes('shift')) {
                syncTag = self.backgroundSync.SYNC_TAGS.SHIFT_CHANGE;
              } else if (requestUrl.pathname.includes('message')) {
                syncTag = self.backgroundSync.SYNC_TAGS.MESSAGE_SEND;
              } else if (requestUrl.pathname.includes('document')) {
                syncTag = self.backgroundSync.SYNC_TAGS.DOCUMENT_UPLOAD;
              } else {
                syncTag = 'default-sync';
              }
              
              // Salva la richiesta e registra la sincronizzazione
              await self.backgroundSync.saveFailedRequest(syncTag, requestData);
              
              return new Response(JSON.stringify({
                offline: true,
                message: 'La tua richiesta è stata salvata e verrà inviata quando sarai di nuovo online.',
                syncTag
              }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (error) {
              console.error('Errore durante il salvataggio della richiesta offline:', error);
              return new Response(JSON.stringify({
                error: 'Impossibile salvare la richiesta per la sincronizzazione.',
                details: error.message
              }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          })()
        );
        return;
      }
    }
    
    return;
  }
  
  // Strategia di caching appropriata in base al tipo di richiesta
  if (isApiRequest || isNetworkFirstRequest) {
    // Strategia NETWORK FIRST per le API e le richieste specificate
    event.respondWith(networkFirst(event.request));
  } else {
    // Strategia CACHE FIRST per tutte le altre risorse
    event.respondWith(cacheFirst(event.request));
  }
});

// Strategia Cache First: controlla prima la cache, poi la rete
async function cacheFirst(request) {
  try {
    // Controlla prima nella cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Se non è in cache, vai in rete
    const networkResponse = await fetch(request);
    
    // Salva la risposta in cache per richieste future
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback in caso di errore
    return handleOfflineFallback(request);
  }
}

// Strategia Network First: prova prima la rete, poi la cache
async function networkFirst(request) {
  try {
    // Prova prima la rete
    const networkResponse = await fetch(request);
    
    // Salva la risposta nella cache dinamica
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Se fallisce, prova dalla cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback se non è in cache
    return handleOfflineFallback(request);
  }
}

// Funzione per gestire i fallback offline
async function handleOfflineFallback(request) {
  // Comportamento specifico per la navigazione
  if (request.mode === 'navigate') {
    return caches.match('/offline.html');
  }
  
  // Fallback per le immagini
  if (request.destination === 'image') {
    return caches.match('/icons/icon-192x192.svg');
  }
  
  // Fallback per le API
  if (request.url.includes('/api/')) {
    return new Response(JSON.stringify({
      offline: true,
      message: 'Non sei connesso a internet. Alcuni dati potrebbero non essere aggiornati.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Fallback generico
  return new Response('Contenuto non disponibile offline', {
    status: 503,
    statusText: 'Servizio non disponibile'
  });
}

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