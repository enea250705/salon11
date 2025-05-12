import { useState, useEffect } from 'react';
import { isPwaInstallable, promptPwaInstall, isAppInstalled } from '@/lib/pwa-installer';
import { DownloadCloud } from 'lucide-react';

interface PWAInstallMenuItemProps {
  className?: string;
  onlyIfInstallable?: boolean;
}

export function PWAInstallMenuItem({
  className = '',
  onlyIfInstallable = true
}: PWAInstallMenuItemProps) {
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  
  useEffect(() => {
    // Controlla se l'app è già installata
    setInstalled(isAppInstalled());
    
    // Controlla se l'app è installabile
    setInstallable(isPwaInstallable());
    
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
  
  // Gestisce il clic sul pulsante
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
  
  // Se il componente deve essere mostrato solo se installabile e l'app non è installabile
  if (onlyIfInstallable && !installable) return null;
  
  // Se l'app è già installata
  if (installed) return null;
  
  return (
    <li className={`flex items-center gap-3 p-2 text-sm font-medium cursor-pointer rounded-md hover:bg-gray-100 ${className}`} onClick={handleInstallClick}>
      <DownloadCloud className="h-5 w-5" />
      <span>Installa App</span>
    </li>
  );
}

export default PWAInstallMenuItem;