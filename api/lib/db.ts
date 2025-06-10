import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a global connection pool for serverless functions
let pool: Pool;
let db: ReturnType<typeof drizzle>;

function getDb() {
  if (!pool) {
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      // Optimized for serverless
      max: 1,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 0,
    });
    db = drizzle({ client: pool, schema });
  }
  return db;
}

export { getDb as db };