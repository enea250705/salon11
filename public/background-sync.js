// Gestione della sincronizzazione in background per Da Vittorino Gestione PWA

// Definizione dei tag di sincronizzazione
const SYNC_TAGS = {
  TIME_OFF_REQUEST: 'time-off-request-sync',
  SHIFT_CHANGE: 'shift-change-sync',
  MESSAGE_SEND: 'message-send-sync',
  DOCUMENT_UPLOAD: 'document-upload-sync'
};

// Salva le richieste fallite in IndexedDB
const saveFailedRequest = async (tag, request) => {
  // Ottieni l'istanza del database
  const db = await openDatabase();
  
  // Salva la richiesta nella collection appropriata
  const tx = db.transaction('offline-requests', 'readwrite');
  const store = tx.objectStore('offline-requests');
  
  await store.put({
    id: new Date().toISOString() + '-' + Math.random().toString(36).substring(2, 15),
    tag,
    request,
    timestamp: new Date().getTime()
  });
  
  await tx.complete;
  console.log('Richiesta salvata per sincronizzazione in background:', tag);
};

// Apre la connessione al database
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('davittorino-offline-db', 1);
    
    // Creazione/aggiornamento dello schema
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-requests')) {
        db.createObjectStore('offline-requests', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(new Error('Errore apertura database: ' + event.target.error));
  });
};

// Recupera le richieste per un tag specifico
const getRequestsByTag = async (tag) => {
  const db = await openDatabase();
  const tx = db.transaction('offline-requests', 'readonly');
  const store = tx.objectStore('offline-requests');
  
  const requests = await store.getAll();
  await tx.complete;
  
  return requests.filter(item => item.tag === tag);
};

// Rimuove una richiesta dal database
const removeRequest = async (id) => {
  const db = await openDatabase();
  const tx = db.transaction('offline-requests', 'readwrite');
  const store = tx.objectStore('offline-requests');
  
  await store.delete(id);
  await tx.complete;
};

// Funzione per processare la sincronizzazione
const processSyncEvent = async (tag) => {
  const requests = await getRequestsByTag(tag);
  
  for (const request of requests) {
    try {
      // Recupera i dati della richiesta originale
      const { url, method, headers, body } = request.request;
      
      // Riprova la richiesta
      const response = await fetch(url, {
        method,
        headers: new Headers(headers),
        body: body ? JSON.parse(body) : undefined,
        credentials: 'include'
      });
      
      if (response.ok) {
        // Se la richiesta ha successo, rimuovi dal database
        await removeRequest(request.id);
        console.log('Sincronizzazione completata per:', request.id);
        
        // Invia una notifica di conferma se possibile
        if (self.registration && self.registration.showNotification) {
          const notificationTitle = 'Sincronizzazione completata';
          let notificationMessage = '';
          
          switch (tag) {
            case SYNC_TAGS.TIME_OFF_REQUEST:
              notificationMessage = 'La tua richiesta di ferie è stata sincronizzata con successo.';
              break;
            case SYNC_TAGS.SHIFT_CHANGE:
              notificationMessage = 'La modifica del turno è stata sincronizzata con successo.';
              break;
            case SYNC_TAGS.MESSAGE_SEND:
              notificationMessage = 'Il tuo messaggio è stato inviato con successo.';
              break;
            case SYNC_TAGS.DOCUMENT_UPLOAD:
              notificationMessage = 'Il tuo documento è stato caricato con successo.';
              break;
            default:
              notificationMessage = 'I dati sono stati sincronizzati con successo.';
          }
          
          self.registration.showNotification(notificationTitle, {
            body: notificationMessage,
            icon: '/icons/icon-192x192.svg',
            badge: '/icons/badge-72x72.svg'
          });
        }
      } else {
        console.error('Sincronizzazione fallita per:', request.id, response.status);
      }
    } catch (error) {
      console.error('Errore durante la sincronizzazione:', error);
      // La richiesta rimane nel database per riprovare in futuro
    }
  }
};

// Se il service worker supporta la sincronizzazione in background, registrala
self.addEventListener('sync', (event) => {
  if (Object.values(SYNC_TAGS).includes(event.tag)) {
    event.waitUntil(processSyncEvent(event.tag));
  }
});

// Funzione per registrare una richiesta per la sincronizzazione in background
const registerSyncRequest = async (tag, url, method, headers, data) => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      // Salva i dati della richiesta
      await saveFailedRequest(tag, {
        url,
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });
      
      // Registra l'evento di sincronizzazione
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      
      return true;
    } catch (error) {
      console.error('Errore durante la registrazione della sincronizzazione:', error);
      return false;
    }
  } else {
    console.warn('Sincronizzazione in background non supportata');
    return false;
  }
};

// Esporta le funzioni per l'uso nell'applicazione
self.backgroundSync = {
  SYNC_TAGS,
  registerSyncRequest,
  saveFailedRequest,
  getRequestsByTag
};