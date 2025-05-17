import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook per ripristinare la posizione dello scroll quando si naviga tra le pagine
 * o si ricarica la pagina.
 */
export function useScrollRestoration() {
  const [location] = useLocation();

  // Salva la posizione dello scroll quando l'utente naviga
  useEffect(() => {
    // Salva la posizione dello scroll attuale per la pagina corrente
    const saveScrollPosition = () => {
      const scrollY = window.scrollY;
      if (scrollY > 0) {
        sessionStorage.setItem(`scroll_${location}`, scrollY.toString());
      }
    };

    // Aggiungi listener per salva la posizione quando l'utente lascia la pagina
    window.addEventListener('beforeunload', saveScrollPosition);
    
    // Salva anche quando cambia la location (navigazione interna)
    saveScrollPosition();

    return () => {
      saveScrollPosition();
      window.removeEventListener('beforeunload', saveScrollPosition);
    };
  }, [location]);

  // Ripristina la posizione dello scroll quando l'utente torna a una pagina
  useEffect(() => {
    const restoreScrollPosition = () => {
      const savedPosition = sessionStorage.getItem(`scroll_${location}`);
      if (savedPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition));
        }, 0);
      }
    };

    // Ripristina la posizione dello scroll
    restoreScrollPosition();
  }, [location]);
}