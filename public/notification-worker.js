// Script di gestione notifiche push in background
// Questo script è separato dal service worker principale
// e si occupa esclusivamente di gestire le notifiche

const NOTIFICATION_ICON = '/icons/icon-192x192.svg';
const BADGE_ICON = '/icons/badge-72x72.svg';

/**
 * Gestione ricezione delle notifiche push
 */
self.addEventListener('push', event => {
  // Estrai i dati dalla notifica
  let notificationData;
  
  try {
    notificationData = event.data.json();
  } catch (e) {
    // Se non è in formato JSON, usa il testo come messaggio
    const message = event.data.text();
    notificationData = {
      title: 'StaffSync',
      body: message,
      data: { url: '/' }
    };
  }
  
  // Configura le opzioni della notifica
  const options = {
    body: notificationData.body || 'Hai una nuova notifica',
    icon: notificationData.icon || NOTIFICATION_ICON,
    badge: notificationData.badge || BADGE_ICON,
    vibrate: [100, 50, 100], // Pattern di vibrazione
    data: {
      url: notificationData.url || '/',
      id: notificationData.id || Date.now().toString(),
      timestamp: Date.now()
    },
    // Aggiungi azioni quando necessario
    actions: notificationData.actions || [
      {
        action: 'view',
        title: 'Visualizza'
      }
    ],
    // Altre opzioni utili
    tag: notificationData.tag || 'staffsync-notification', // Raggruppa notifiche simili
    renotify: notificationData.renotify || true, // Notifica anche se c'è già una notifica con lo stesso tag
    requireInteraction: notificationData.requireInteraction || false, // Se true, la notifica rimane attiva fino all'interazione dell'utente
  };
  
  // Mostra la notifica
  event.waitUntil(
    self.registration.showNotification(notificationData.title || 'StaffSync', options)
  );
});

/**
 * Gestione clic sulla notifica
 */
self.addEventListener('notificationclick', event => {
  // Chiudi la notifica
  event.notification.close();
  
  // Recupera i dati della notifica
  const { url } = event.notification.data;
  
  // Gestisci le azioni specifiche (se presenti)
  if (event.action === 'view') {
    // Azione di visualizzazione (default)
    console.log('Utente ha cliccato su "Visualizza"');
  } else if (event.action === 'dismiss') {
    // Azione di rifiuto/ignoramento
    console.log('Utente ha ignorato la notifica');
    return; // Non aprire nessuna finestra
  }
  
  // Apri la finestra o focus su quella esistente
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Controlla se c'è già una finestra aperta con l'URL target
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Se non c'è nessuna finestra, aprila
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

/**
 * Gestione chiusura della notifica (quando l'utente la elimina)
 */
self.addEventListener('notificationclose', event => {
  // Registra a scopo di analisi che l'utente ha chiuso la notifica senza interagire
  const { id, timestamp } = event.notification.data;
  console.log(`Utente ha chiuso la notifica ${id} dopo ${Date.now() - timestamp}ms senza interagire`);
});