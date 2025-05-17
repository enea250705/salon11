# Guida al Deployment su Vercel

Questo documento fornisce tutte le informazioni necessarie per deployare l'applicazione "Da Vittorino" su Vercel.

## Ottimizzazioni Implementate

- **Configurazione Database**: Configurazione ottimizzata del pool di connessioni per ambiente serverless
- **Gestione Sessioni**: Cookie e opzioni di sessione configurate per funzionare in ambiente serverless
- **CORS**: Configurazione CORS ottimizzata per domini specifici in produzione
- **Manutenzione Automatica**: Implementato endpoint di manutenzione che viene eseguito via cron
- **Chiusura Connessioni**: Aggiunta gestione di SIGTERM e SIGINT per chiudere le connessioni al database

## Variabili d'Ambiente da Configurare su Vercel

Queste variabili devono essere configurate nel pannello di amministrazione di Vercel:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
SESSION_SECRET=tua-chiave-segreta-per-le-sessioni
MAINTENANCE_SECRET=tua-chiave-segreta-per-la-manutenzione
NODE_ENV=production
```

## Passaggi per il Deployment

1. **Collegare il Repository**:
   Collega il repository Git all'account Vercel

2. **Configura il Progetto**:
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Configura le Variabili d'Ambiente**:
   Aggiungi tutte le variabili elencate sopra nella sezione "Environment Variables"

4. **Configura il Database**:
   - Assicurati che il database Neon sia accessibile pubblicamente
   - Verifica che l'URL del database sia corretto nella variabile DATABASE_URL

5. **Deploy**:
   Clicca sul pulsante "Deploy" per avviare il deployment

## Verifica del Deployment

Dopo il deployment, verifica che:

1. L'applicazione sia accessibile all'URL fornito da Vercel
2. Il login funzioni correttamente
3. La connessione al database sia stabilita
4. Le notifiche e i messaggi vengano inviati correttamente

## Troubleshooting

Se riscontri problemi:

1. **Errori di Connessione al Database**:
   - Verifica che DATABASE_URL sia corretto
   - Controlla che il database sia accessibile pubblicamente
   - Verifica che il firewall non blocchi le connessioni da Vercel

2. **Errori di Sessione**:
   - Assicurati che SESSION_SECRET sia impostato
   - Verifica che i cookie funzionino correttamente

3. **Errori di CORS**:
   - Aggiungi il dominio fornito da Vercel alla lista whitelist nel file `server/config/vercel.ts`

4. **Problemi con Cron Jobs**:
   - Verifica che l'endpoint `/api/maintenance` sia accessibile
   - Controlla che MAINTENANCE_SECRET sia correttamente impostato

## Monitoraggio

Per monitorare l'applicazione dopo il deployment:

1. Utilizza il pannello di controllo di Vercel per visualizzare i log
2. Configura alerting per errori critici
3. Imposta un monitoraggio per verificare la disponibilità dell'applicazione

## Aggiornamenti Futuri

Per aggiornare l'applicazione in futuro:

1. Effettua le modifiche nel repository Git
2. Fai push delle modifiche
3. Vercel eseguirà automaticamente il deployment della nuova versione