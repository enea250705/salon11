import { useState, useEffect } from 'react';
import { isPwaInstallable, promptPwaInstall, isAppInstalled } from '@/lib/pwa-installer';
import { Button } from '@/components/ui/button';
import { DownloadCloud, X } from 'lucide-react';

export function PWAInstallBanner() {
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    // Controlla lo stato dell'app
    const checkStatus = () => {
      setInstalled(isAppInstalled());
      setInstallable(isPwaInstallable());
    };
    
    // Controlla subito lo stato
    checkStatus();
    
    // Controlla anche se l'utente ha già chiuso il banner in precedenza
    const hasDismissed = localStorage.getItem('pwa-banner-dismissed');
    if (hasDismissed === 'true') {
      setDismissed(true);
    }
    
    // Aggiungi listener per i cambiamenti di stato
    const handleInstallable = () => setInstallable(true);
    const handleInstalled = () => {
      setInstallable(false);
      setInstalled(true);
    };
    
    window.addEventListener('pwaInstallable', handleInstallable);
    window.addEventListener('pwaInstalled', handleInstalled);
    
    return () => {
      window.removeEventListener('pwaInstallable', handleInstallable);
      window.removeEventListener('pwaInstalled', handleInstalled);
    };
  }, []);
  
  // Gestisce il clic sul pulsante di installazione
  const handleInstallClick = async () => {
    try {
      const result = await promptPwaInstall();
      if (result) {
        setInstalled(true);
        setInstallable(false);
      }
    } catch (error) {
      console.error('Errore durante l\'installazione:', error);
    }
  };
  
  // Gestisce la chiusura del banner
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };
  
  // Non mostrare il banner se non è installabile, è già installato o è stato chiuso
  if (!installable || installed || dismissed) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-4 border border-gray-200 flex items-center justify-between">
        <div className="flex-1 mr-4">
          <h4 className="font-semibold text-sm text-gray-900">Installa StaffSync</h4>
          <p className="text-xs text-gray-600 mt-1">
            Installa l'app per accedervi più facilmente e usarla offline
          </p>
        </div>
        <div className="flex items-center">
          <Button 
            size="sm" 
            onClick={handleInstallClick}
            className="mr-2 px-3 py-1 h-auto"
          >
            <DownloadCloud className="h-4 w-4 mr-1" />
            Installa
          </Button>
          <button 
            onClick={handleDismiss} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallBanner;