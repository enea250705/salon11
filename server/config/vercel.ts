/**
 * Configurazione specifica per l'ambiente Vercel
 * Questo file contiene impostazioni ottimizzate per il deployment serverless su Vercel
 */

export const isVercelProduction = process.env.VERCEL === '1' && process.env.NODE_ENV === 'production';

/**
 * Configura il connection pool in modo appropriato per Vercel Serverless Functions
 * In un ambiente serverless, è importante limitare il numero di connessioni al database
 * poiché ogni invocazione della funzione potrebbe creare nuove connessioni
 */
export const databasePoolConfig = {
  // Configura il pool in base all'ambiente
  max: isVercelProduction ? 10 : 50, // Numero massimo di connessioni nel pool
  idleTimeoutMillis: isVercelProduction ? 10000 : 30000, // Chiudi connessioni inattive dopo 10s in prod
  connectionTimeoutMillis: isVercelProduction ? 5000 : 10000, // Timeout connessione più breve in prod
};

/**
 * Ottimizza la configurazione di sessione per Vercel
 * Le sessioni in un ambiente serverless funzionano diversamente rispetto a un server tradizionale
 */
export const sessionConfig = {
  cookie: {
    secure: isVercelProduction, // Cookie sicuri solo in produzione
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 giorni
    sameSite: isVercelProduction ? 'strict' : 'lax', // Strict è più sicuro quando tutto è sullo stesso dominio
  },
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
};