import { useOfflineStatus } from '@/hooks/use-offline';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';

/**
 * Componente che mostra un indicatore dello stato di connessione
 * e permette di sincronizzare i dati quando si torna online
 */
export function OfflineIndicator() {
  const { offline, wasOffline, checkConnectivity } = useOfflineStatus();
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  
  // Gestisce la sincronizzazione dei dati quando si torna online
  useEffect(() => {
    // Se eravamo offline e ora siamo tornati online
    if (wasOffline && !offline) {
      handleSync();
    }
  }, [wasOffline, offline]);
  
  // Funzione per sincronizzare manualmente i dati
  const handleSync = async () => {
    if (offline) return; // Non sincronizzare se ancora offline
    
    setSyncing(true);
    
    try {
      // Invalida tutte le query per forzare un nuovo fetch dei dati
      await queryClient.invalidateQueries();
      
      // Tenta di registrare la sincronizzazione anche con il service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        
        // Crea un canale di comunicazione con il service worker
        const messageChannel = new MessageChannel();
        
        // Attendi la risposta
        const syncResult = await new Promise((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data.success);
          };
          
          // Invia messaggio al service worker
          registration.active?.postMessage({
            type: 'SYNC_NOTIFICATIONS'
          }, [messageChannel.port2]);
          
          // Timeout per evitare attese infinite
          setTimeout(() => resolve(false), 3000);
        });
        
        console.log('Sincronizzazione con service worker:', syncResult);
      }
      
      // Mostra lo stato completato
      setSyncComplete(true);
      setTimeout(() => setSyncComplete(false), 3000);
    } catch (error) {
      console.error('Errore durante la sincronizzazione:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  // Se non siamo mai stati offline e siamo online, non mostrare nulla
  if (!offline && !wasOffline) return null;
  
  return (
    <div className={`fixed bottom-4 right-4 rounded-full shadow-lg z-50 transition-all 
      ${offline ? 'bg-red-600' : (wasOffline ? 'bg-green-600' : 'bg-blue-600')} 
      text-white px-4 py-2 flex items-center space-x-2 text-sm`}
    >
      {offline ? (
        <>
          <WifiOff size={16} />
          <span>Offline</span>
        </>
      ) : wasOffline ? (
        <>
          <Wifi size={16} />
          <span>Online</span>
          <Button 
            variant="ghost" 
            size="sm"
            className="ml-2 p-0 h-6 text-white hover:text-white hover:bg-green-700 focus:ring-offset-green-600"
            onClick={handleSync}
            disabled={syncing || syncComplete}
          >
            {syncing ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : syncComplete ? (
              '✓'
            ) : (
              <RefreshCw size={16} />
            )}
            {syncing ? 'Sincronizzazione...' : syncComplete ? 'Sincronizzato' : 'Sincronizza'}
          </Button>
        </>
      ) : null}
    </div>
  );
}

export default OfflineIndicator;