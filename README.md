# NOVAflair

## Quick Start

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

| Service | Port | Description |
|---------|------|-------------|
| **UI** | `8080` | Vite-built React app served via Nginx |
| **Node-RED** | `1880` | Automation / data pipelines |
| **Metabase** | `3000` | Analytics and dashboards |

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
   PUID=1001
   PGID=1001
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

   See `docs/secrets.md` for the full environment file policy.

2. **Build and start**

   ```bash
   docker compose up -d --build
   ```

3. **Verify**

   - UI: http://localhost:8080
   - Node-RED: http://localhost:1880
   - Metabase: http://localhost:3000
