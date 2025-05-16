# Sistema di Gestione Personale "Da Vittorino"

Applicazione di gestione del personale per il ristorante "Da Vittorino" con funzionalità di scheduling, gestione documenti e richieste di permessi.

## Funzionalità

- Autenticazione utente con ruoli (admin e dipendenti)
- Pianificazione turni con interfaccia tipo Excel
- Gestione richieste ferie e permessi
- Distribuzione documenti (buste paga, CUD)
- Calcolo automatico ore di lavoro
- Generazione automatica di turni

## Stack Tecnologico

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (tramite Neon Database)
- **ORM**: Drizzle

## Deploy su Vercel

Per deployare l'applicazione su Vercel, segui questi passaggi:

1. **Clona il repository**:
   ```
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Configura le variabili d'ambiente**:
   - Copia il file `.env.example` in un nuovo file `.env`
   - Compila tutte le variabili d'ambiente necessarie
   - In particolare, assicurati di configurare `DATABASE_URL` e le credenziali per l'invio di email

3. **Collega a Vercel**:
   - Installa Vercel CLI: `npm i -g vercel`
   - Esegui `vercel login` e segui le istruzioni
   - Esegui `vercel` nella directory del progetto e segui le istruzioni per il deploy

4. **Configura le variabili d'ambiente su Vercel**:
   - Vai su vercel.com nella dashboard del tuo progetto
   - Naviga su "Settings" > "Environment Variables"
   - Aggiungi tutte le variabili presenti nel tuo file `.env`

5. **Per gli aggiornamenti successivi**:
   - Esegui `vercel --prod` per aggiornare l'ambiente di produzione

## Credenziali di accesso

- Admin: Username `admin`, Password `admin123`
- Dipendente: Username `employee`, Password `employee123`

## Note importanti

- Assicurati che il database PostgreSQL sia accessibile pubblicamente o da Vercel
- Configura correttamente il server SMTP per l'invio di email
- Vercel imposta automaticamente variabili d'ambiente come `NODE_ENV=production`

## Sviluppo locale

1. Installa le dipendenze: `npm install`
2. Avvia il server di sviluppo: `npm run dev`
3. Apri il browser su `http://localhost:5000`