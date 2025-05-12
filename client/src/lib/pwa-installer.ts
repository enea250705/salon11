// Implementazione delle funzionalità PWA per Da Vittorino Gestione

// Definizione dell'interfaccia per l'evento beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Variabile per memorizzare l'evento di installazione
let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Verifica se l'app è già installata
export function isAppInstalled(): boolean {
  // Verifica se l'app è in modalità standalone o è già stata installata
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

// Verifica se l'app può essere installata
export function isPwaInstallable(): boolean {
  return !!deferredPrompt;
}

// Inizializza gli eventi per l'installazione PWA
export function initPwaInstaller() {
  if (typeof window === 'undefined') return;

  // Se l'app è già installata, non mostriamo il prompt
  if (isAppInstalled()) {
    window.dispatchEvent(new Event('pwaInstalled'));
    return;
  }
  
  // Intercetta l'evento beforeinstallprompt per mostrare il nostro prompt personalizzato
  window.addEventListener('beforeinstallprompt', (e) => {
    // Impedisce al browser di mostrare automaticamente il prompt di installazione
    e.preventDefault();
    
    // Memorizza l'evento per poterlo attivare in seguito
    deferredPrompt = e as BeforeInstallPromptEvent;
    
    // Notifica l'app che l'installazione è disponibile
    window.dispatchEvent(new Event('pwaInstallable'));
    
    console.log('PWA installabile: evento beforeinstallprompt ricevuto');
  });
  
  // Gestisce l'evento appinstalled quando l'app viene installata
  window.addEventListener('appinstalled', () => {
    // Azzera il prompt differito poiché l'app è stata installata
    deferredPrompt = null;
    
    // Notifica l'app che l'installazione è completata
    window.dispatchEvent(new Event('pwaInstalled'));
    
    console.log('PWA installata con successo');
  });
}

// Mostra il prompt di installazione PWA
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('Nessun prompt di installazione disponibile');
    return false;
  }
  
  // Mostra il prompt di installazione
  await deferredPrompt.prompt();
  
  // Attende la risposta dell'utente
  const choiceResult = await deferredPrompt.userChoice;
  
  // Resetta il prompt differito - può essere usato solo una volta
  deferredPrompt = null;
  
  // Restituisce true se l'utente ha accettato l'installazione
  return choiceResult.outcome === 'accepted';
}

// Funzione per registrare il service worker per la PWA
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registrato con successo:', registration);
      
      // Controlla se ci sono aggiornamenti del service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Un nuovo service worker è disponibile, mostra notifica all'utente
              window.dispatchEvent(new CustomEvent('pwaUpdateAvailable'));
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Errore durante la registrazione del Service Worker:', error);
      return null;
    }
  } else {
    console.log('Service Worker non supportato in questo browser');
    return null;
  }
}