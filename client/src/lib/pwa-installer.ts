/**
 * Utility per gestire l'installazione della PWA
 */

// Evento BeforeInstallPrompt
let deferredPrompt: any = null;

// Verifica se l'app è installabile
export function isPwaInstallable(): boolean {
  return !!deferredPrompt;
}

// Cattura l'evento di installazione
export function initPwaInstaller() {
  // Cattura l'evento beforeinstallprompt (viene emesso quando l'app è installabile)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Previeni la visualizzazione automatica del prompt
    e.preventDefault();
    // Salva l'evento per mostrarlo più tardi
    deferredPrompt = e;
    
    // Notifica all'applicazione che l'app è installabile
    const event = new CustomEvent('pwaInstallable');
    window.dispatchEvent(event);
  });
  
  // Rileva quando l'app è già installata
  window.addEventListener('appinstalled', () => {
    // Resetta il prompt di installazione
    deferredPrompt = null;
    
    // Notifica all'applicazione che l'app è stata installata
    const event = new CustomEvent('pwaInstalled');
    window.dispatchEvent(event);
    
    console.log('PWA installata con successo');
  });
}

// Mostra il prompt di installazione
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('Nessun prompt di installazione disponibile');
    return false;
  }
  
  // Mostra il prompt di installazione
  deferredPrompt.prompt();
  
  // Attendi la decisione dell'utente
  const { outcome } = await deferredPrompt.userChoice;
  
  // Resetta il prompt
  deferredPrompt = null;
  
  // Ritorna true se l'installazione è stata accettata
  return outcome === 'accepted';
}

// Aggiunge un piccolo banner per promuovere l'installazione
export function createPromotionalBanner(
  containerId: string, 
  message: string = 'Installa questa app sul tuo dispositivo',
  buttonText: string = 'Installa'
) {
  // Verifica che l'elemento container esista
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Crea il banner
  const banner = document.createElement('div');
  banner.className = 'pwa-install-banner';
  banner.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: #f8f9fa;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin: 16px 0;
  `;
  
  // Crea il messaggio
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  messageEl.style.cssText = `
    margin: 0;
    font-size: 14px;
  `;
  
  // Crea il pulsante
  const button = document.createElement('button');
  button.textContent = buttonText;
  button.style.cssText = `
    background-color: #4a6cf7;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-weight: 500;
  `;
  
  // Aggiungi event listener per il pulsante
  button.addEventListener('click', async () => {
    const installed = await promptPwaInstall();
    if (installed) {
      // Rimuovi il banner se l'installazione è avvenuta con successo
      banner.remove();
    }
  });
  
  // Aggiungi elementi al banner
  banner.appendChild(messageEl);
  banner.appendChild(button);
  
  // Aggiungi banner al container
  container.prepend(banner);
  
  // Aggiungi gestore per nascondere il banner quando l'app è installata
  window.addEventListener('pwaInstalled', () => {
    banner.remove();
  });
  
  return banner;
}

// Rileva se l'app è in modalità standalone (installata)
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

// Inizializza il modulo
export function initPwa() {
  if (typeof window !== 'undefined') {
    initPwaInstaller();
  }
}