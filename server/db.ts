import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { databasePoolConfig, isVercelProduction } from './config/vercel';

// Configura il WebSocket per Neon Database
neonConfig.webSocketConstructor = ws;

// Verifica la presenza della variabile d'ambiente DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configurazione del pool di connessioni ottimizzata per ambienti serverless
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ...databasePoolConfig
});

// Log di informazioni sulle connessioni in ambiente di sviluppo
if (!isVercelProduction) {
  console.log(`Database pool configurato con max ${databasePoolConfig.max} connessioni`);
}

// Inizializza Drizzle ORM con lo schema definito
export const db = drizzle({ client: pool, schema });

// Gestione della pulizia delle connessioni in chiusura
process.on('SIGTERM', () => {
  console.log('SIGTERM ricevuto, chiusura connessioni database...');
  pool.end();
});

process.on('SIGINT', () => {
  console.log('SIGINT ricevuto, chiusura connessioni database...');
  pool.end();
});
