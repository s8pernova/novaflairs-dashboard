# Operator mobile learning path

The app starts with mock telemetry so UI work stays fast and deterministic. Run it
from this directory with:

```bash
npm run android
```

Edit a component and save it. Metro should update the running app with Fast Refresh.
Changes to `app.json`, native dependencies, or environment variables can require a
full reload or restart.

## What is already wired

- `App.tsx` owns loading, ready, and error screen states.
- `src/domain/telemetry.ts` defines the app-facing telemetry shape and summary math.
- `src/data/telemetryRepository.ts` is the app's data boundary.
- `src/components/` contains reusable presentation components.
- `src/data/mockObservations.ts` keeps development independent from the database.

## Your first exercises

1. Add a fifth metric to `App.tsx`, such as the latest wind direction.
2. Make markers in `TelemetryPlot.tsx` selectable with `Pressable`, then show the
   selected observation's details below the plot.
3. Replace the body of `getTelemetryObservations` with a Supabase query. Keep the
   function's return type unchanged so the rest of the app does not care where its
   data came from.
4. Replace the coordinate plot with a real React Native map after the data query is
   working. This should be a separate milestone because a native map adds setup and
   platform configuration.

## Supabase milestone

Do not put a service-role key in this app. Mobile bundles are public. Use a
publishable key and protect `telemetry_observations` with Row Level Security.

When you reach exercise 3:

```bash
cp .env.example .env.local
npx expo install @supabase/supabase-js
```

Fill in `.env.local`, create `src/data/supabaseClient.ts`, and query only the fields
the app uses. Supabase returns the database's snake_case columns, so map each row to
the camelCase `TelemetryObservation` shape inside the repository. That mapping is an
important app-development exercise and keeps database details out of components.

Commit `package-lock.json` after installing the dependency. Never commit
`.env.local`.
