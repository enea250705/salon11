/**
 * Utility di navigazione avanzata che garantisce il reset della posizione di scroll
 * quando si naviga tra le pagine dell'applicazione
 */

/**
 * Naviga a un percorso specificato e assicura che la pagina venga visualizzata dall'inizio
 * @param path Il percorso a cui navigare
 * @param setLocation La funzione setLocation di wouter
 */
export function navigateTo(path: string, setLocation: (path: string) => void): void {
  // Prima resetta la posizione dello scroll
  window.scrollTo(0, 0);
  
  // Poi naviga alla nuova pagina
  setLocation(path);
  
  // Garantisce che anche dopo il caricamento della nuova pagina lo scroll sia all'inizio
  // (utile per browser che potrebbero mantenere la posizione dello scroll)
  setTimeout(() => {
    window.scrollTo(0, 0);
  }, 10);
}