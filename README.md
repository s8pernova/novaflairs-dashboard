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

   Copy and fill out the root `.env` file with production values:

   ```
   # Node-RED
   NODE_RED_CREDENTIAL_SECRET=...
   NODE_RED_ADMIN_PASSWORD=...

   # Database (Supabase Postgres)
   DB_USER=...
   DB_PASSWORD=...
   DB_PORT=5432
   DB_NAME=...
   DB_HOST=...
   DB_SSL_REJECT_UNAUTHORIZED=true

   # User/Group for Node-RED container
   PUID=1001
   PGID=1001

   # UI Build Args
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

2. **Build and start**

   ```bash
   docker compose up -d --build
   ```

3. **Verify**

   - UI: http://localhost:8080
   - Node-RED: http://localhost:1880
   - Metabase: http://localhost:3000
