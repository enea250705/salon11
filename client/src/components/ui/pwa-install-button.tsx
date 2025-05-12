import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { isPwaInstallable, promptPwaInstall, isAppInstalled } from '@/lib/pwa-installer';
import { DownloadCloud } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  onlyIfInstallable?: boolean;
}

export function PWAInstallButton({
  variant = 'default',
  size = 'default',
  className = '',
  onlyIfInstallable = true
}: PWAInstallButtonProps) {
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
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={handleInstallClick}
    >
      <DownloadCloud className="mr-2 h-4 w-4" />
      Installa App
    </Button>
  );
}

export default PWAInstallButton;