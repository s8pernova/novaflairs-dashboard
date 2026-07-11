# NOVAflair

## Quick Start

### Database Development

NOVAflair uses local Supabase and keeps all executable database history under `supabase/migrations/`.

```bash
npm install
npx supabase --version
npm run db:check-layout
```

Start the disposable local Supabase stack when database work is needed:

```bash
npm run db:start
npm run db:status
```

`npm run db:reset` destroys and recreates the local database, reapplies every
migration, and loads the local demo seed. Do not run it when local database state
must be preserved.

The existing Cloud project predates Supabase migration history. Read
`supabase/README.md` before any linked history repair or migration push. Adding
the committed migration files does not authorize applying them to Cloud.

### Developer Setup (UI)

1. **Create local env file**

   ```bash
   cp ui/.env.local.example ui/.env.local
   ```

   Fill in Supabase credentials _only if using the database_:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. **Install dependencies and run**

   ```bash
   cd ui
   npm install
   npm run dev
   ```

   The dev server starts at **http://localhost:5173**.

---

### Docker Build (Production)

The compose stack runs three services:

| Service      | Port   | Description                           |
| ------------ | ------ | ------------------------------------- |
| **UI**       | `8080` | Vite-built React app served via Nginx |
| **Node-RED** | `1880` | Automation / data pipelines           |
| **Metabase** | `3000` | Analytics and dashboards              |

1. **Configure environment**

   Copy and fill out the root `.env` file with Docker Compose values:

   ```bash
   cp .env.example .env
   cp nodered/.env.example nodered/.env
   ```

   The root `.env` is intentionally limited to orchestration and
   browser-visible UI build values:

   ```
   TZ=America/New_York
   PUID=1000
   PGID=1000
   NODE_RED_DB_CA_CERT_PATH=/etc/novaflairs/supabase-ca.pem

   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

   Node-RED secrets and database credentials belong in `nodered/.env`:

   ```
   NODE_RED_ADMIN_USER=admin
   NODE_RED_CREDENTIAL_SECRET=...
   NODE_RED_ADMIN_PASSWORD='...' # bcrypt hash, not a plain-text password

   DB_HOST=...
   DB_PORT=5432
   DB_NAME=...
   DB_USER=...
   DB_PASSWORD='...'
   DB_SSL_REJECT_UNAUTHORIZED=true
   ```

   See `docs/adr/0003-keep-secrets-scoped-to-runtime.md` for the full
   environment file policy.

2. **Build and start**

   ```bash
   docker compose up -d --build
   ```

3. **Verify**
   - UI: http://localhost:8080
   - Node-RED: http://localhost:1880
   - Metabase: http://localhost:3000

   Node-RED stores mutable runtime data in the `node_red_data` Docker volume.
   The repo contains only the seed files copied into that volume on first run.
