# Operator mobile development

The Android prototype runs as an Expo development build on the Windows-hosted
`Galaxy_Tab_A9` emulator. Expo and Metro run in WSL with Node 22.

## Prerequisites

- Start the `Galaxy_Tab_A9` AVD in Android Studio.
- Install the current EAS development APK on the emulator.
- Create the ignored `.env` from `.env.example` and provide the Supabase values
  and restricted Google Maps Android key.
- Run `nvm use 22` and `npm install` from this directory.

Create a new development APK whenever native dependencies or native Expo config
change:

```bash
npm run build:android:development
```

Ordinary TypeScript, component, and style changes do not need a new APK.

Regenerate the tracked launcher, adaptive, splash, and favicon PNGs after
changing a `assets/novaflair-*.svg` source:

```bash
npm run generate:assets
```

## Start the app

Run this command from `apps/operator-mobile`:

```bash
npm run android
```

The command performs two jobs:

1. `scripts/android-bridge.sh` starts or reuses a Linux ADB server on a
   WSL-local Unix socket, connects it to the Windows emulator transport at
   `127.0.0.1:5555`, and maps Android port 8081 back to WSL Metro.
2. Expo starts Metro in development-client mode and opens the installed
   `com.novaflair.operator` application.

Keeping the ADB server inside WSL is intentional. An ADB reverse rule owned by
the Windows server targets Windows localhost, which cannot reach WSL Metro in
this machine's mirrored-network configuration.

Keep the terminal open while developing. Saving a TypeScript or style change
should update the app through Fast Refresh. Stop Metro with `Ctrl+C`; the small
WSL ADB server remains available for the next run.

To stop that reusable ADB server as well:

```bash
ADB_SERVER_SOCKET="localfilesystem:${XDG_RUNTIME_DIR:-/tmp}/novaflair-operator-adb.sock" \
  /usr/lib/android-sdk/platform-tools/adb kill-server
```

## Preview build

The `preview` EAS profile produces an internal-distribution APK with the
production-style embedded JavaScript bundle:

```bash
npm run build:android:preview
```

Unlike the development build, the preview does not use Metro. Its public
Supabase configuration and restricted Maps key come from the project-scoped EAS
`preview` environment. Install and test this artifact before a judge demo.

## Verification

Before committing mobile changes, run:

```bash
npm run typecheck
npm run lint
npm test
npx expo export --platform android
```

Unit tests cannot prove native map and emulator behavior. Before a demo build,
complete this manual smoke checklist on `Galaxy_Tab_A9`:

- [ ] The app opens directly in landscape without an Expo error screen.
- [ ] Google map tiles render, and pan and zoom gestures remain responsive.
- [ ] Map markers match the latest Supabase observation coordinates.
- [ ] Selecting and clearing a marker updates the detail panel.
- [ ] Refresh updates the timestamp without blanking the map.
- [ ] A new Node-RED observation appears without restarting the app.

## Data boundary

`src/data/telemetryRepository.ts` reads `operator_observation_feed` through the
publishable Supabase client and maps database rows into the app-facing
`TelemetryObservation` type. Never put a service-role key or database password
in this app; mobile configuration is recoverable from the installed bundle.
