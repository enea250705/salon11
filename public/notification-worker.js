// Worker dedicato per la gestione delle notifiche push
// Questo worker viene utilizzato per elaborare le notifiche push e sincronizzarle

// Importa le dipendenze necessarie
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');

// Nome del database e versione
const DB_NAME = 'staffsync-notifications';
const DB_VERSION = 1;

// Definizione degli object stores
const NOTIFICATION_STORE = 'notifications';
const READ_STATUS_STORE = 'read-status';

// Apre o crea il database
async function openDatabase() {
  return await idb.openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Crea lo store per le notifiche
      if (!db.objectStoreNames.contains(NOTIFICATION_STORE)) {
        const notificationStore = db.createObjectStore(NOTIFICATION_STORE, { keyPath: 'id' });
        notificationStore.createIndex('userId', 'userId', { unique: false });
        notificationStore.createIndex('timestamp', 'timestamp', { unique: false });
        notificationStore.createIndex('read', 'read', { unique: false });
      }
      
      // Crea lo store per tenere traccia delle notifiche lette
      if (!db.objectStoreNames.contains(READ_STATUS_STORE)) {
        db.createObjectStore(READ_STATUS_STORE, { keyPath: 'notificationId' });
      }
    }
  });
}

// Salva una notifica nel database
async function saveNotification(notification) {
  const db = await openDatabase();
  await db.add(NOTIFICATION_STORE, {
    ...notification,
    timestamp: notification.timestamp || Date.now(),
    read: false
  });
}

// Marca una notifica come letta
async function markNotificationAsRead(notificationId) {
  const db = await openDatabase();
  const tx = db.transaction(NOTIFICATION_STORE, 'readwrite');
  const notification = await tx.store.get(notificationId);
  
  if (notification) {
    notification.read = true;
    await tx.store.put(notification);
  }
  
  await tx.done;
  
  return notification;
}

// Ottiene tutte le notifiche per un utente
async function getNotificationsForUser(userId) {
  const db = await openDatabase();
  return await db.getAllFromIndex(NOTIFICATION_STORE, 'userId', userId);
}

// Sincronizza le notifiche con il server
async function syncNotifications() {
  if (!navigator.onLine) {
    console.log('Offline, sincronizzazione notifiche rimandata');
    return;
  }
  
  try {
    const db = await openDatabase();
    const notificationsToSync = await db.getAll(READ_STATUS_STORE);
    
    if (notificationsToSync.length === 0) {
      console.log('Nessuna notifica da sincronizzare');
      return;
    }
    
    // Invia le notifiche al server
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationsToSync)
    });
    
    if (response.ok) {
      // Rimuovi le notifiche sincronizzate
      const tx = db.transaction(READ_STATUS_STORE, 'readwrite');
      for (const notification of notificationsToSync) {
        await tx.store.delete(notification.notificationId);
      }
      await tx.done;
      
      console.log(`${notificationsToSync.length} notifiche sincronizzate con successo`);
    } else {
      console.error('Errore durante la sincronizzazione delle notifiche:', await response.text());
    }
  } catch (error) {
    console.error('Errore durante la sincronizzazione delle notifiche:', error);
  }
}

/**
 * Gestione ricezione delle notifiche push
 */
self.addEventListener('push', async (event) => {
  try {
    if (!event.data) {
      console.warn('Ricevuta notifica push senza dati');
      return;
    }
    
    const data = event.data.json();
    
    // Salva la notifica nel database locale
    await saveNotification({
      id: data.id || Date.now().toString(),
      title: data.title,
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.svg',
      badge: data.badge || '/icons/badge-72x72.svg',
      url: data.url || '/',
      userId: data.userId,
      timestamp: data.timestamp || Date.now(),
      type: data.type || 'general'
    });
    
    // Mostra la notifica
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.svg',
      badge: data.badge || '/icons/badge-72x72.svg',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        id: data.id,
        userId: data.userId
      },
      actions: [
        {
          action: 'open',
          title: 'Apri'
        },
        {
          action: 'close',
          title: 'Chiudi'
        }
      ],
      // Mostra le notifiche immediatamente
      requireInteraction: data.requireInteraction || false,
      // Aggiunge la priorità alta per le notifiche importanti
      silent: data.silent || false,
      renotify: data.renotify || false,
      tag: data.tag || 'staffsync-notification'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Errore durante la gestione della notifica push:', error);
  }
});

/**
 * Gestione clic sulla notifica
 */
self.addEventListener('notificationclick', async (event) => {
  event.notification.close();
  
  const url = event.notification.data.url;
  const notificationId = event.notification.data.id;
  
  // Se l'utente fa clic su "Apri" o sulla notifica stessa
  if (event.action === 'open' || event.action === '') {
    // Marca la notifica come letta
    if (notificationId) {
      try {
        await markNotificationAsRead(notificationId);
        
        // Salva lo stato di lettura per la sincronizzazione
        const db = await openDatabase();
        await db.put(READ_STATUS_STORE, {
          notificationId,
          timestamp: Date.now(),
          read: true
        });
        
        // Tenta di sincronizzare immediatamente
        syncNotifications();
      } catch (error) {
        console.error('Errore durante l\'aggiornamento dello stato di lettura:', error);
      }
    }
    
    // Apri o focalizza la finestra esistente
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Verifica se c'è già una finestra aperta con l'URL della notifica
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          // Se non c'è una finestra aperta, aprila
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

/**
 * Gestione chiusura della notifica (quando l'utente la elimina)
 */
self.addEventListener('notificationclose', (event) => {
  const notificationId = event.notification.data.id;
  
  // Nessuna azione specifica è necessaria quando la notifica viene chiusa,
  // ma potremmo voler registrare questo evento per analisi
  console.log(`Notifica ${notificationId} chiusa dall'utente`);
});

// Gestione degli eventi di sincronizzazione in background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Esporta le funzioni per l'uso tramite messaggi
self.onmessage = async (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'GET_NOTIFICATIONS':
      try {
        const { userId } = payload;
        const notifications = await getNotificationsForUser(userId);
        event.ports[0].postMessage({ notifications });
      } catch (error) {
        event.ports[0].postMessage({ error: error.message });
      }
      break;
      
    case 'MARK_AS_READ':
      try {
        const { notificationId } = payload;
        const updatedNotification = await markNotificationAsRead(notificationId);
        event.ports[0].postMessage({ success: true, notification: updatedNotification });
      } catch (error) {
        event.ports[0].postMessage({ error: error.message });
      }
      break;
      
    case 'SYNC_NOTIFICATIONS':
      try {
        await syncNotifications();
        event.ports[0].postMessage({ success: true });
      } catch (error) {
        event.ports[0].postMessage({ error: error.message });
      }
      break;
      
    default:
      event.ports[0].postMessage({ error: 'Comando non riconosciuto' });
  }
};