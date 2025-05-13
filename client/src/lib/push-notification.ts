/**
 * Modulo per la gestione delle notifiche push
 */

// Controlla se le notifiche push sono supportate dal browser
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Controlla se l'utente ha già concesso i permessi per le notifiche
export function isPushNotificationPermissionGranted(): boolean {
  return Notification.permission === 'granted';
}

// Richiede il permesso per inviare notifiche push
export async function requestPushNotificationPermission(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    console.warn('Le notifiche push non sono supportate da questo browser');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Errore durante la richiesta di permesso per le notifiche:', error);
    return false;
  }
}

// Registra l'utente per ricevere notifiche push (sottoscrizione)
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported() || !isPushNotificationPermissionGranted()) {
    return null;
  }

  try {
    // Ottieni la registrazione del service worker
    const registration = await navigator.serviceWorker.ready;

    // Controlla se l'utente è già iscritto
    const existingSubscription = await registration.pushManager.getSubscription();
    
    if (existingSubscription) {
      return existingSubscription;
    }

    // Genera le chiavi VAPID (le chiavi pubbliche dovrebbero arrivare dal server)
    // Per questa demo useremo chiavi pubbliche statiche
    const vapidPublicKey = 'BMnw-DIwEUZjehXljzmJFza-kRLwaxJ9wPwLDvX-Tl9CfiHsrrVPmEtqxDeoXy4Snwg-AXnHhzTQTKVHPnVVxAA';
    
    // Converti la chiave pubblica in array di byte
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    
    // Crea una nuova sottoscrizione
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
    
    // Invia la sottoscrizione al server per memorizzarla
    await sendSubscriptionToServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Errore durante la sottoscrizione alle notifiche push:', error);
    return null;
  }
}

// Annulla l'iscrizione alle notifiche push
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return true; // Già non iscritto
    }
    
    // Annulla l'iscrizione
    const success = await subscription.unsubscribe();
    
    // Notifica il server della cancellazione
    if (success) {
      await sendSubscriptionToServer(subscription, true);
    }
    
    return success;
  } catch (error) {
    console.error('Errore durante la cancellazione della sottoscrizione:', error);
    return false;
  }
}

// Invia la sottoscrizione al server
async function sendSubscriptionToServer(subscription: PushSubscription, unsubscribe: boolean = false): Promise<boolean> {
  try {
    const endpoint = unsubscribe ? '/api/notifications/unsubscribe' : '/api/notifications/subscribe';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription)
    });
    
    if (!response.ok) {
      throw new Error(`Errore del server: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Errore durante l\'invio della sottoscrizione al server:', error);
    return false;
  }
}

// Funzione di utilità per convertire la chiave base64 URL safe in Uint8Array
// Necessaria per l'applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Funzione per verificare se l'utente è iscritto alle notifiche push
export async function isPushNotificationSubscribed(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('Errore durante il controllo della sottoscrizione:', error);
    return false;
  }
}

// Funzione per ottenere la sottoscrizione attuale (se esiste)
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Errore durante il recupero della sottoscrizione:', error);
    return null;
  }
}

// Estende l'interfaccia NotificationOptions per includere vibrazioni e altre opzioni
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
}

// Invia una notifica locale (non tramite il server)
export function sendLocalNotification(title: string, options: ExtendedNotificationOptions = {}): void {
  if (!isPushNotificationPermissionGranted()) {
    console.warn('Permesso per le notifiche non concesso');
    return;
  }

  // Imposta le opzioni di default se non specificate
  const notificationOptions: ExtendedNotificationOptions = {
    body: options.body || 'Notifica da Da Vittorino Gestione',
    icon: options.icon || '/icons/icon-192x192.png',
    badge: options.badge || '/icons/badge-72x72.png',
    vibrate: options.vibrate || [100, 50, 100],
    ...options
  };

  // Mostra la notifica
  new Notification(title, notificationOptions);
}