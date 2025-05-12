/**
 * Utilità per gestire le funzionalità offline nell'applicazione
 */

/**
 * Controlla se l'applicazione è attualmente offline
 * @returns {boolean} True se l'app è offline, false altrimenti
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Registra un callback da eseguire quando lo stato online/offline cambia
 * @param {(online: boolean) => void} callback - Funzione da chiamare quando lo stato cambia
 * @returns {() => void} Funzione per rimuovere i listener
 */
export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Verifica se la funzionalità di sincronizzazione in background è supportata
 * @returns {boolean} True se il browser supporta la sincronizzazione in background
 */
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Registra una richiesta per la sincronizzazione in background
 * @param {string} tag - Tag identificativo per il tipo di sincronizzazione
 * @param {string} url - URL della richiesta
 * @param {string} method - Metodo HTTP (POST, PUT, DELETE)
 * @param {Record<string, string>} headers - Header della richiesta
 * @param {any} data - Dati della richiesta
 * @returns {Promise<boolean>} True se la richiesta è stata registrata con successo
 */
export async function registerOfflineRequest(
  tag: string,
  url: string,
  method: string,
  headers: Record<string, string>,
  data?: any
): Promise<boolean> {
  if (!isBackgroundSyncSupported()) {
    console.warn('La sincronizzazione in background non è supportata da questo browser');
    return false;
  }

  try {
    // Ottieni una reference al service worker
    const registration = await navigator.serviceWorker.ready;
    
    // Accedi alle funzioni esposte dal service worker tramite i messaggi
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success);
      };
      
      // Invia la richiesta al service worker
      registration.active?.postMessage({
        type: 'REGISTER_SYNC',
        payload: {
          tag,
          request: {
            url,
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined
          }
        }
      }, [messageChannel.port2]);
      
      // Timeout per evitare attese infinite
      setTimeout(() => resolve(false), 3000);
    });
  } catch (error) {
    console.error('Errore durante la registrazione della sincronizzazione:', error);
    return false;
  }
}

/**
 * Mostra una notifica all'utente quando si trova in modalità offline
 * @param {string} message - Messaggio da mostrare
 * @returns {void}
 */
export function showOfflineNotification(message: string = "Sei attualmente offline. Alcune funzionalità potrebbero non essere disponibili."): void {
  const notification = document.createElement('div');
  notification.className = 'offline-notification';
  notification.innerHTML = `
    <div class="offline-content">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
      <span>${message}</span>
    </div>
    <button class="offline-close" aria-label="Chiudi notifica">×</button>
  `;
  
  // Aggiungi lo stile solo se non è già presente
  if (!document.getElementById('offline-notification-style')) {
    const style = document.createElement('style');
    style.id = 'offline-notification-style';
    style.textContent = `
      .offline-notification {
        position: fixed;
        bottom: 16px;
        left: 16px;
        right: 16px;
        background-color: #ff5252;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 9999;
        animation: slideInUp 0.3s forwards;
        max-width: 400px;
        margin: 0 auto;
      }
      
      .offline-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .offline-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 4px;
      }
      
      @keyframes slideInUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutDown {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(100%);
          opacity: 0;
        }
      }
      
      .offline-notification.hiding {
        animation: slideOutDown 0.3s forwards;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Aggiungi la notifica al DOM
  document.body.appendChild(notification);
  
  // Aggiungi l'event listener per il pulsante di chiusura
  const closeButton = notification.querySelector('.offline-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      notification.classList.add('hiding');
      setTimeout(() => {
        notification.remove();
      }, 300);
    });
  }
  
  // Rimuovi automaticamente dopo 5 secondi
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.classList.add('hiding');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  }, 5000);
}

/**
 * Classe per gestire i dati offline utilizzando IndexedDB
 */
export class OfflineStorage {
  private dbName: string;
  private dbVersion: number;
  
  constructor(dbName: string = 'staffsync-offline-storage', version: number = 1) {
    this.dbName = dbName;
    this.dbVersion = version;
  }
  
  /**
   * Apre la connessione al database
   * @returns {Promise<IDBDatabase>} L'istanza del database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Crea gli object store necessari
        if (!db.objectStoreNames.contains('cached-data')) {
          db.createObjectStore('cached-data', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('pending-requests')) {
          db.createObjectStore('pending-requests', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('user-settings')) {
          db.createObjectStore('user-settings', { keyPath: 'key' });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Errore durante l\'apertura del database'));
    });
  }
  
  /**
   * Salva i dati nella cache locale
   * @param {string} key - Chiave per identificare i dati
   * @param {any} data - Dati da salvare
   * @returns {Promise<void>}
   */
  async saveData(key: string, data: any): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cached-data'], 'readwrite');
      const store = transaction.objectStore('cached-data');
      
      const request = store.put({
        id: key,
        data,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Errore durante il salvataggio dei dati'));
      
      transaction.oncomplete = () => db.close();
    });
  }
  
  /**
   * Recupera i dati dalla cache locale
   * @param {string} key - Chiave per identificare i dati
   * @returns {Promise<any>} I dati salvati o null se non trovati
   */
  async getData(key: string): Promise<any> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cached-data'], 'readonly');
      const store = transaction.objectStore('cached-data');
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
      
      request.onerror = () => reject(new Error('Errore durante il recupero dei dati'));
      
      transaction.oncomplete = () => db.close();
    });
  }
  
  /**
   * Rimuove i dati dalla cache locale
   * @param {string} key - Chiave per identificare i dati
   * @returns {Promise<void>}
   */
  async removeData(key: string): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cached-data'], 'readwrite');
      const store = transaction.objectStore('cached-data');
      
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Errore durante la rimozione dei dati'));
      
      transaction.oncomplete = () => db.close();
    });
  }
  
  /**
   * Salva un'impostazione utente
   * @param {string} key - Nome dell'impostazione
   * @param {any} value - Valore dell'impostazione
   * @returns {Promise<void>}
   */
  async saveSetting(key: string, value: any): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['user-settings'], 'readwrite');
      const store = transaction.objectStore('user-settings');
      
      const request = store.put({
        key,
        value,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Errore durante il salvataggio dell\'impostazione'));
      
      transaction.oncomplete = () => db.close();
    });
  }
  
  /**
   * Recupera un'impostazione utente
   * @param {string} key - Nome dell'impostazione
   * @returns {Promise<any>} Il valore dell'impostazione o null se non trovata
   */
  async getSetting(key: string): Promise<any> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['user-settings'], 'readonly');
      const store = transaction.objectStore('user-settings');
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      
      request.onerror = () => reject(new Error('Errore durante il recupero dell\'impostazione'));
      
      transaction.oncomplete = () => db.close();
    });
  }
}

// Istanza singleton per l'uso in tutta l'app
export const offlineStorage = new OfflineStorage();