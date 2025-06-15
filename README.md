# 💇‍♀️ Gestione Salone - Sistema di Gestione Parrucchiere

Un sistema completo per la gestione di saloni di bellezza e parrucchieri, con funzionalità avanzate di prenotazione, gestione clienti e promemoria automatici.

## 🌟 Caratteristiche Principali

### 🔐 **Autenticazione Sicura**
- Login privato con JWT
- Sessioni sicure e persistenti
- Controllo accessi basato su ruoli

### 📱 **Compatibilità Mobile**
- Ottimizzato per iPhone e iPad
- Design responsive e touch-friendly
- PWA ready per installazione come app

### 👥 **Gestione Clienti**
- Registro completo clienti
- Note personalizzate per preferenze e prodotti
- Ricerca avanzata e filtri
- Storico appuntamenti

### 📅 **Calendario Avanzato**
- **3 viste**: Mensile, Settimanale, Giornaliera
- **Drag & Drop**: Sposta appuntamenti facilmente
- Gestione stilisti e servizi
- Calcolo automatico durata e prezzi

### 📱 **Promemoria WhatsApp**
- Invio automatico promemoria
- Template personalizzabili
- Schedulazione intelligente
- Integrazione API WhatsApp

### ⚡ **Sincronizzazione Real-time**
- Database Neon PostgreSQL
- Architettura serverless
- Aggiornamenti istantanei
- Backup automatici

## 🚀 Deploy Automatico

Il progetto è configurato per deploy automatico su **Cloudflare Pages** tramite GitHub Actions.

### Configurazione Deploy

1. **Fork questo repository**
2. **Configura Secrets GitHub**:
   ```
   CLOUDFLARE_API_TOKEN=your_api_token
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   ```
3. **Push su main** → Deploy automatico! 🎉

## 🛠️ Sviluppo Locale

### Prerequisiti
- Node.js 18+
- Account Neon Database
- Account Cloudflare (per deploy)

### Setup
```bash
# Clona il repository
git clone https://github.com/your-username/gestione-salone.git
cd gestione-salone

# Installa dipendenze
npm install

# Configura environment variables
cp .env.example .env
# Modifica .env con i tuoi dati

# Avvia sviluppo
npm run dev
```

### Variabili d'Ambiente
```env
DATABASE_URL=postgresql://username:password@host/database
JWT_SECRET=your-super-secret-key
NODE_ENV=development
```

## 📦 Comandi Disponibili

```bash
# Sviluppo
npm run dev              # Vite + Vercel dev
npm run dev:cf           # Vite + Cloudflare dev
npm run dev:vite         # Solo Vite

# Build
npm run build            # Build produzione
npm run build:cf         # Build + Deploy Cloudflare

# Database
npm run db:push          # Sync schema database
npm run db:studio        # Apri Drizzle Studio

# Deploy
npm run cf:login         # Login Cloudflare
npm run cf:deploy        # Deploy manuale
```

## 🏗️ Architettura

### Frontend
- **React 18** con TypeScript
- **Vite** per build veloce
- **Tailwind CSS** per styling
- **Radix UI** per componenti
- **React Query** per state management
- **dnd-kit** per drag & drop

### Backend
- **Serverless Functions** (Cloudflare/Vercel)
- **Drizzle ORM** per database
- **Neon PostgreSQL** database
- **JWT** per autenticazione
- **Zod** per validazione

### Deploy & Hosting
- **Cloudflare Pages** per hosting
- **GitHub Actions** per CI/CD
- **Edge Functions** per API
- **CDN globale** per performance

## 🔧 Configurazione Produzione

### 1. Database Setup
```sql
-- Crea utente admin
INSERT INTO users (username, password, firstName, lastName, role)
VALUES ('admin', '$2a$10$hashed_password', 'Admin', 'User', 'admin');
```

### 2. Cloudflare Pages
- Collega repository GitHub
- Configura environment variables
- Deploy automatico attivo

### 3. Dominio Personalizzato
- Aggiungi dominio in Cloudflare Pages
- Configura DNS records
- SSL automatico attivo

## 📊 Performance

- **Lighthouse Score**: 95+ su tutti i parametri
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 500KB gzipped

## 🔒 Sicurezza

- **HTTPS** obbligatorio
- **JWT** con scadenza
- **CORS** configurato
- **Headers** di sicurezza
- **Input validation** completa

## 🤝 Contribuire

1. Fork il progetto
2. Crea feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi `LICENSE` per dettagli.

## 🆘 Supporto

Per supporto e domande:
- 📧 Email: support@gestione-salone.com
- 💬 Issues: [GitHub Issues](https://github.com/your-username/gestione-salone/issues)
- 📖 Docs: [Documentazione completa](https://docs.gestione-salone.com)

---

**Fatto con ❤️ per parrucchieri professionali**