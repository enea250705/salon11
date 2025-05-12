import { useState, useEffect, useCallback } from 'react';
import { isOffline, onConnectivityChange, showOfflineNotification } from '@/lib/offline-util';

/**
 * Hook per gestire lo stato online/offline dell'applicazione
 * 
 * @param {boolean} showNotifications - Se true, mostra notifiche quando lo stato cambia
 * @returns {Object} Oggetto contenente:
 *   - offline: boolean che indica se l'applicazione è offline
 *   - wasOffline: boolean che indica se l'applicazione è stata offline dall'ultimo controllo
 *   - checkConnectivity: funzione per controllare manualmente lo stato di connettività
 */
export function useOffline(showNotifications = true) {
  const [offline, setOffline] = useState(isOffline());
  const [wasOffline, setWasOffline] = useState(false);

  // Funzione per controllare lo stato di connettività
  const checkConnectivity = useCallback(() => {
    const currentOfflineState = isOffline();
    
    if (offline !== currentOfflineState) {
      setOffline(currentOfflineState);
      
      // Se stiamo passando da offline a online, imposta wasOffline a true
      if (!currentOfflineState && offline) {
        setWasOffline(true);
        
        // Reset wasOffline dopo 10 secondi
        setTimeout(() => {
          setWasOffline(false);
        }, 10000);
        
        if (showNotifications) {
          // Mostra notifica di ritorno online
          const notification = document.createElement('div');
          notification.className = 'online-notification';
          notification.innerHTML = `
            <div class="online-content">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                <line x1="12" y1="20" x2="12.01" y2="20"></line>
              </svg>
              <span>Sei tornato online. Sincronizzazione in corso...</span>
            </div>
            <button class="online-close" aria-label="Chiudi notifica">×</button>
          `;
          
          // Aggiungi lo stile
          if (!document.getElementById('online-notification-style')) {
            const style = document.createElement('style');
            style.id = 'online-notification-style';
            style.textContent = `
              .online-notification {
                position: fixed;
                bottom: 16px;
                left: 16px;
                right: 16px;
                background-color: #4caf50;
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
              
              .online-content {
                display: flex;
                align-items: center;
                gap: 12px;
              }
              
              .online-close {
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
              
              .online-notification.hiding {
                animation: slideOutDown 0.3s forwards;
              }
            `;
            document.head.appendChild(style);
          }
          
          // Aggiungi la notifica al DOM
          document.body.appendChild(notification);
          
          // Aggiungi l'event listener per il pulsante di chiusura
          const closeButton = notification.querySelector('.online-close');
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
      } else if (currentOfflineState && showNotifications) {
        // Mostra notifica quando vai offline
        showOfflineNotification();
      }
    }
  }, [offline, showNotifications]);

  // Imposta i listener per i cambiamenti di connettività
  useEffect(() => {
    // Verifica lo stato iniziale
    checkConnectivity();
    
    // Aggiungi i listener per i cambiamenti di connettività
    const cleanup = onConnectivityChange((online) => {
      setOffline(!online);
      
      if (!online && showNotifications) {
        showOfflineNotification();
      }
    });
    
    return cleanup;
  }, [checkConnectivity, showNotifications]);

  return { offline, wasOffline, checkConnectivity };
}

/**
 * Componente provider per la connettività offline
 * Fornisce informazioni sullo stato offline a tutta l'applicazione
 */
import { createContext, ReactNode, useContext } from 'react';

interface OfflineContextType {
  offline: boolean;
  wasOffline: boolean;
  checkConnectivity: () => void;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ 
  children,
  showNotifications = true 
}: { 
  children: ReactNode;
  showNotifications?: boolean;
}) {
  const offlineState = useOffline(showNotifications);
  
  return (
    <OfflineContext.Provider value={offlineState}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOfflineStatus() {
  const context = useContext(OfflineContext);
  
  if (!context) {
    throw new Error('useOfflineStatus deve essere usato all\'interno di un OfflineProvider');
  }
  
  return context;
}