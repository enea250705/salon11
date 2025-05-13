/**
 * Script per inizializzare il database e creare le tabelle
 * Questo script crea tutte le tabelle definite in shared/schema.ts
 */

import { pool, db } from '../server/db';
import { 
  users, schedules, shifts, timeOffRequests, 
  documents, notifications, messages 
} from '../shared/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Inizializzazione del database...');

  try {
    // Creare le tabelle in ordine di dipendenza
    console.log('Creazione tabella users...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT NOT NULL,
        position TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE
      )
    `);

    console.log('Creazione tabella schedules...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        is_published BOOLEAN NOT NULL DEFAULT false,
        published_at TIMESTAMP WITH TIME ZONE,
        created_by INTEGER NOT NULL REFERENCES users(id),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Creazione tabella shifts...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        schedule_id INTEGER NOT NULL REFERENCES schedules(id),
        day TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        type TEXT NOT NULL,
        area TEXT,
        notes TEXT
      )
    `);

    console.log('Creazione tabella time_off_requests...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS time_off_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        type TEXT NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Creazione tabella documents...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        path TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        is_global BOOLEAN NOT NULL DEFAULT false,
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Creazione tabella notifications...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        data JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Creazione tabella messages...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        "fromUserId" INTEGER NOT NULL REFERENCES users(id),
        "toUserId" INTEGER NOT NULL REFERENCES users(id),
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Creazione tabella per session store di express-session...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        sid varchar NOT NULL COLLATE "default",
        sess json NOT NULL,
        expire timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY (sid)
      )
    `);

    console.log('Database inizializzato con successo!');
  } catch (error) {
    console.error('Errore durante l\'inizializzazione del database:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);