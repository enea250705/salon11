import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, DownloadCloud } from 'lucide-react';
import { isPwaInstallable, promptPwaInstall, isAppInstalled } from '@/lib/pwa-installer';

export function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [installable, setInstallable] = useState(false);
  
  useEffect(() => {
    // Non mostrare il banner se l'app è già stata installata
    if (isAppInstalled()) return;
    
    // Controlla se l'app è installabile
    setInstallable(isPwaInstallable());
    
    // Controlla se l'utente ha già chiuso il banner
    const hasDismissed = localStorage.getItem('pwaInstallBannerDismissed') === 'true';
    
    // Determina se mostrare il banner
    setShow(!hasDismissed && isPwaInstallable());
    
    // Listener per l'evento 'pwaInstallable'
    const handleInstallable = () => {
      const hasDismissed = localStorage.getItem('pwaInstallBannerDismissed') === 'true';
      setInstallable(true);
      setShow(!hasDismissed);
    };
    
    // Listener per l'evento 'pwaInstalled'
    const handleInstalled = () => {
      setInstallable(false);
      setShow(false);
    };
    
    window.addEventListener('pwaInstallable', handleInstallable);
    window.addEventListener('pwaInstalled', handleInstalled);
    
    return () => {
      window.removeEventListener('pwaInstallable', handleInstallable);
      window.removeEventListener('pwaInstalled', handleInstalled);
    };
  }, []);
  
  if (!show) return null;
  
  const handleDismiss = () => {
    localStorage.setItem('pwaInstallBannerDismissed', 'true');
    setShow(false);
  };
  
  const handleInstall = async () => {
    try {
      const result = await promptPwaInstall();
      if (result) {
        setShow(false);
      }
    } catch (error) {
      console.error('Errore durante l\'installazione:', error);
    }
  };
  
  return (
    <Card className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 p-4 shadow-lg z-50 flex items-center justify-between bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900 max-w-md">
      <div className="flex items-center space-x-3">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-2 rounded-full">
          <DownloadCloud className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium text-sm sm:text-base">Installa StaffSync</h4>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Accedi più velocemente e lavora offline</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" className="rounded-full p-1.5" onClick={handleDismiss} aria-label="Chiudi">
          <X className="h-4 w-4" />
        </Button>
        <Button size="sm" className="rounded-md px-3 py-1.5" onClick={handleInstall}>
          Installa
        </Button>
      </div>
    </Card>
  );
}