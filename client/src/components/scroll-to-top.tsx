import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Component that handles scrolling to top when route changes
 * Automatically scrolls to the top of the page for both navigation and refresh
 * Usage: Just add this component once at the app root level
 */
export function ScrollToTop() {
  const [location] = useLocation();

  // Scroll immediatamente quando cambia la rotta
  useEffect(() => {
    // Scroll to top immediatamente quando cambia la location
    window.scrollTo(0, 0);
    
    // Anche con un piccolo ritardo per assicurarsi che funzioni dopo il rendering
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 10);
    
    return () => clearTimeout(timeoutId);
  }, [location]);

  // Handle page refresh e primo caricamento
  useEffect(() => {
    // Funzione che imposta la posizione dello scroll all'inizio
    const resetScroll = () => {
      // Scroll immediato (senza animazioni)
      window.scrollTo(0, 0);
      
      // Anche con un ritardo per assicurarsi che funzioni dopo il rendering del DOM
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 50);
    };

    // Esegui subito al montaggio del componente
    resetScroll();
    
    // Eventi da monitorare per il reset dello scroll
    window.addEventListener('load', resetScroll);
    window.addEventListener('beforeunload', resetScroll);
    
    // Applica anche quando le pagine vengono ripristinate dallo storico
    window.addEventListener('popstate', resetScroll);
    
    // Clean up degli event listener
    return () => {
      window.removeEventListener('load', resetScroll);
      window.removeEventListener('beforeunload', resetScroll);
      window.removeEventListener('popstate', resetScroll);
    };
  }, []);

  // This component doesn't render anything
  return null;
}