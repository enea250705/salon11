import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  isPushNotificationSupported, 
  isPushNotificationPermissionGranted,
  requestPushNotificationPermission,
  subscribeToPushNotifications
} from '@/lib/push-notification';

/**
 * Banner che chiede all'utente il permesso per abilitare le notifiche push
 * Mostrato solo se le notifiche sono supportate e l'utente non ha già concesso il permesso
 */
export function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  useEffect(() => {
    // Controlla se il banner dovrebbe essere mostrato
    const shouldShow = 
      isPushNotificationSupported() && 
      !isPushNotificationPermissionGranted() &&
      localStorage.getItem('notificationPermissionDismissed') !== 'true';
    
    setShow(shouldShow);
  }, []);

  // Gestisce la richiesta di permesso
  const handleRequestPermission = async () => {
    setPermissionRequested(true);
    
    try {
      const granted = await requestPushNotificationPermission();
      
      if (granted) {
        // Se il permesso è concesso, sottoscrivi alle notifiche
        const subscription = await subscribeToPushNotifications();
        
        if (subscription) {
          console.log('Sottoscrizione alle notifiche completata con successo');
          // Nascondi il banner poiché abbiamo ottenuto il permesso
          setShow(false);
        }
      } else {
        // L'utente ha negato il permesso, mostra feedback
        console.log('Permesso per le notifiche negato');
      }
    } catch (error) {
      console.error('Errore durante la richiesta di permesso:', error);
    } finally {
      setPermissionRequested(false);
    }
  };

  // Gestisce la chiusura del banner
  const handleDismiss = () => {
    // Memorizza che l'utente ha chiuso il banner
    localStorage.setItem('notificationPermissionDismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 p-4 shadow-lg z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-900 max-w-md gap-3">
      <div className="flex items-center space-x-3">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-2 rounded-full">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium text-sm sm:text-base">Attiva le notifiche</h4>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Ricevi aggiornamenti sui turni e nuovi documenti
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 self-end sm:self-auto">
        <Button 
          variant="ghost" 
          size="sm" 
          className="rounded-full p-1.5" 
          onClick={handleDismiss} 
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button 
          size="sm" 
          className="rounded-md px-3 py-1.5" 
          onClick={handleRequestPermission}
          disabled={permissionRequested}
        >
          {permissionRequested ? 'Attendi...' : 'Attiva'}
        </Button>
      </div>
    </Card>
  );
}

export default NotificationPermissionBanner;