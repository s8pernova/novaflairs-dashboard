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

### Operator Mobile App

The Android tablet prototype lives in `apps/operator-mobile`. Use Node 22 and
the Windows-hosted `Galaxy_Tab_A9` emulator documented in
`apps/operator-mobile/DEVELOPMENT.md`.

For normal development:

```bash
cd apps/operator-mobile
nvm use
npm ci
cp .env.example .env
npm run android
```

The ignored `.env` needs the public Supabase URL, publishable key, and restricted
Google Maps Android key. Never put a service-role key or database password in
the mobile app.

Create a standalone internal preview with the EAS `preview` environment:

```bash
cd apps/operator-mobile
nvm use
npm run build:android:preview
```

The EAS environment must define `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `GOOGLE_MAPS_ANDROID_API_KEY`.
Install the resulting APK on the target tablet; it runs without Metro or Expo
Go.

For the deterministic operator demo:

```bash
docker compose \
  --env-file .env \
  --env-file nodered/.env \
  up -d --build nodered
```

Open `http://localhost:1880`, select the `Scenario Simulator` flow, and select
**Reset**. The mobile app polls Supabase every eight seconds and should cover
moderate, transition, and high crossing risk. The faster manual replay
sequence and read-only database trace are documented in `nodered/README.md`.

Current prototype limitations:

- The app reads seeded scenario `1`; scenario selection is not implemented.
- There is no operator authentication, role-based authorization, or offline
  cache.
- Foreground polling is used instead of Supabase Realtime or background work.
- The simulator is deterministic demonstration software, not a validated
  wildfire forecast.
- The preview targets Android tablets; iOS and app-store release work are
  deferred.

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
   docker compose \
     --env-file .env \
     --env-file nodered/.env \
     up -d --build
   ```

3. **Verify**
   - UI: http://localhost:8080
   - Node-RED: http://localhost:1880
   - Metabase: http://localhost:3000

   Node-RED stores mutable runtime data in the `node_red_data` Docker volume.
   Committed flows, settings, and dependencies are refreshed from the image on
   every start; credentials, sessions, and context remain in the volume.

Production bootstrap, data migration, deployment checks, and rollback are
documented in [`docs/operations/deployment.md`](docs/operations/deployment.md).
