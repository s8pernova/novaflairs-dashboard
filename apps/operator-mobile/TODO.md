# Operator mobile prototype TODO

## Prototype definition of done

The prototype is complete when an Android tablet can:

- launch the app in landscape without a development error screen;
- read recent telemetry and prediction results from Supabase with a publishable
  client key;
- show observation locations, wind, flame, burn-time, and crossing-risk data;
- render observations on a native map and show details when a marker is tapped;
- refresh automatically while the app is active and manually on demand;
- clearly handle loading, empty, stale, and error states;
- run from a reproducible setup documented in this repository; and
- install as a preview build that does not depend on the developer's Expo Go app.

The first prototype targets the Android tablet workflow. Authentication,
offline-first storage, background processing, push notifications, iOS release,
and app-store submission are deliberately deferred.

## 0. Baseline

- [x] Create the Expo SDK 56 TypeScript app inside the monorepo.
- [x] Run Metro in WSL and connect it to the Windows Android emulator through
      `adb`.
- [x] Lock the first operator experience to landscape.
- [x] Build a working mock-data dashboard with loading and error states.
- [x] Define the app-facing `TelemetryObservation` type and summary calculations.
- [x] Put data access behind `getTelemetryObservations()`.
- [x] Add deterministic mock observations for UI development.
- [x] Add metric cards and a temporary coordinate plot.
- [x] Document the local Fast Refresh workflow in `DEVELOPMENT.md`.

## 1. Establish the maintainable app structure

- [x] Move the dashboard screen from `App.tsx` to
      `src/screens/OperatorDashboardScreen.tsx`; keep `App.tsx` as the thin app
      entrypoint.
- [x] Add `src/theme/tokens.ts` for shared colors, spacing, typography, borders,
      and risk-level colors.
- [x] Update `MetricCard` and `TelemetryPlot` to consume theme tokens rather
      than repeating color literals.
- [x] Add `react-native-safe-area-context` and keep all controls clear of system
      bars and display cutouts.
- [x] Add package scripts for `typecheck`, `lint`, and `test`.
- [x] Pin the app to its supported Node 22 runtime with `.nvmrc` and the package
      engine declaration.
- [x] Add ESLint and the Expo-compatible Jest setup, keeping package and lockfile
      changes together.
- [x] Keep `StyleSheet` as the styling system for this prototype. Reconsider
      NativeWind only after the native layout and component patterns are
      understood.

Verification:

- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] The mock dashboard still renders correctly in the tablet emulator.

Known toolchain advisory (2026-07-11): `npm audit` reports a moderate `uuid`
advisory through Expo's `@expo/config-plugins -> xcode` build-tool chain. npm's
forced fix would downgrade Expo to SDK 46, so do not apply it. Recheck the
advisory when upgrading Expo rather than breaking SDK compatibility.

## 2. Define the real read contract

The current database stores measurements in `telemetry_observations` and model
outputs in `prediction_results`. Crossing probability is not a column on
`telemetry_observations`, so the app needs one intentional joined read model.

- [x] Define an `operator_observation_feed` database view containing only the
      fields the app needs:
  - observation and scenario identifiers;
  - `observed_at`, `lat`, and `lon`;
  - wind speed and direction;
  - flame length and burn time;
  - quality score;
  - latest crossing probability, risk level, crossing decision, and prediction
    timestamp.
- [x] Make the view `security_invoker = true` so underlying Row Level Security
      remains authoritative.
- [x] Add read grants and SELECT policies for every underlying table the view
      reads. The existing migration only grants reads on
      `telemetry_observations`; `prediction_results` still needs an explicit
      decision.
- [x] Expose the view to the Supabase Data API and grant only `SELECT` to the
      intended `anon` and/or `authenticated` role.
- [x] Add the schema change through the repository's migration process. Review
      the migration before running it; do not change the production database by
      hand.
- [x] Test the view with the same role the mobile client will use and verify
      that it returns one latest prediction per observation.
- [x] Decide the prototype's scenario rule. Start with scenario `1` only if the
      seeded `Brushfire Westline 01` remains the intended demo; otherwise pass a
      selected scenario ID into the repository.

Contract decision: the view contains every scenario and the mobile repository
must receive an explicit scenario ID. The first prototype may pass seeded
scenario `1` at the screen boundary, but neither the view nor repository will
hide that choice as an internal default. Observation identifiers, scenario ID,
drone ID, timestamp, wind speed, flame length, and burn time are required.
Firebreak ID, coordinates, altitude, quality, and every prediction field are
nullable; prediction fields are null together until a model result exists.

Verification:

- [x] An anonymous or authenticated client query returns the expected rows.
- [x] A client key cannot insert, update, or delete telemetry or predictions.
- [x] The view's column names and nullability are recorded before mobile code is
      updated.

Verified against the linked project on 2026-07-13: migration
`20260712033404_operator_observation_feed.sql` is recorded remotely, the `anon`
role can read scenario `1`, cannot write the feed or its underlying tables, and
the feed returns zero duplicate observations.

## 3. Connect the mobile app to Supabase

- [x] Install pinned `@supabase/supabase-js` and
      `react-native-url-polyfill` versions with `npx expo install` and update
      the lockfile.
- [x] Copy `.env.example` to the ignored `.env` file and fill in
      `EXPO_PUBLIC_SUPABASE_URL` and
      `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [x] Confirm `.env` remains ignored. Never place a service-role key or
      database password in the mobile project.
- [x] Add `src/data/supabaseClient.ts` with explicit missing-environment errors.
- [x] Because this prototype has no login, configure the client without
      persistent auth-session storage. Add session storage only when auth is a
      real feature.
- [x] Add a raw database-row type for `operator_observation_feed`.
- [x] Map the view's snake_case row into the camelCase
      `TelemetryObservation` type inside `telemetryRepository.ts`.
- [x] Query explicit columns, filter by the selected scenario, order by
      `observed_at` descending, and apply a bounded limit such as 25.
- [x] Remove the silent runtime mock fallback. Keep deterministic fixtures
      local to the tests that consume them; a failed real query must produce
      the app's error state.
- [x] Replace the `Training data` header state with an honest connection state:
      loading, live, or unavailable. Stale-data detection belongs to step 4.

Verification:

- [x] The emulator displays real rows from Supabase.
- [ ] Temporarily using an invalid URL produces the visible error state.
- [ ] Restoring valid configuration recovers through the Retry action.
- [x] No service-role key, database password, or live `.env.local` is tracked by
      Git.

Verified on `Galaxy_Tab_A9` on 2026-07-14: the publishable client returned live
scenario `1` rows, the app rendered them in Expo Go, and the ignored `.env` was
not present in Git. Invalid-configuration recovery is covered by a screen test,
but the manual `.env` mutation checks remain intentionally unchecked.

## 4. Finish the operator interaction model

- [x] Add selected-observation state to the dashboard screen.
- [x] Make every plotted point or map marker a touch target.
- [x] Show a compact detail panel for the selected observation with timestamp,
      wind direction, wind speed, flame length, burn time, quality, crossing
      probability, risk level, and predicted crossing decision.
- [x] Add a clear selection action without navigating away from the operational
      view.
- [x] Show when the feed was last successfully refreshed.
- [x] Distinguish an empty feed from a network failure.
- [x] Mark data stale after a documented 30-second threshold instead of continuing to
      label old data as live.
- [x] Add accessibility labels and roles for refresh, markers, risk status, and
      observation details.

Verification:

- [x] A marker can be selected and deselected with touch.
- [ ] Long values and missing nullable values do not break the layout.
- [ ] Loading, empty, stale, selected, and error states are visually distinct.

## 5. Replace the temporary plot with a native map

Use `react-native-maps` for this prototype. On Android it uses Google Maps and,
as of the current Expo Go release, requires a development build with the app's
own Google Maps key to render the base map. `expo-maps` remains alpha.

- [x] Install `react-native-maps` with:

  ```bash
  npx expo install react-native-maps
  ```

- [x] Replace `TelemetryPlot` with an `ObservationMap` built around `MapView`.
- [x] Fit the initial camera to the returned observation coordinates instead of
      hard-coding a city-scale viewport.
- [x] Render one marker per positioned observation.
- [x] Color markers from the shared risk-level tokens.
- [x] Scale markers conservatively from flame length without obscuring nearby
      points.
- [x] Draw wind direction as short polylines or arrows from each observation.
- [x] Connect marker presses to the selected-observation detail panel.
- [x] Keep the no-position state working when rows have null coordinates.
- [x] Configure and restrict a Google Maps API key before creating a standalone
      Android build. Do not expose an unrestricted general-purpose key.

The Android key is restricted to `com.novaflair.operator` and the EAS-managed
signing certificate. EAS stores the key as a sensitive, project-scoped build
variable for the development, preview, and production environments.

Verification:

- [x] The map renders in an Android development build on the Galaxy Tab A9
      emulator.
- [ ] Markers appear at the same coordinates returned by Supabase.
- [ ] Panning, zooming, marker selection, and screen rotation constraints work.
- [ ] The map remains usable when several observations overlap.

References:

- [Expo SDK 56 react-native-maps documentation](https://docs.expo.dev/versions/v56.0.0/sdk/map-view/)
- [Expo Maps status](https://docs.expo.dev/versions/v56.0.0/sdk/maps/)
- [Upstream Expo Go blank-map report](https://github.com/react-native-maps/react-native-maps/issues/5888)

## 6. Make the feed update like an operational tool

- [x] Keep the manual Refresh action.
- [x] Add foreground polling at a modest interval, initially 5-10 seconds.
- [x] Pause polling when the app is not active.
- [x] Prevent overlapping requests when a previous refresh is still running.
- [x] Clean up timers when the screen unmounts.
- [x] Preserve the last successful observations during a refresh and show a
      smaller refreshing indicator instead of blanking the whole map.
- [x] Record the last successful refresh time and mark the feed stale when
      updates stop.
- [x] Treat Supabase Realtime as a post-prototype optimization unless polling
      proves inadequate during the demo.

Verification:

- [ ] A new database observation appears without restarting the app.
- [x] Backgrounding and reopening the app does not create duplicate polling.
- [ ] A temporary network failure preserves old data, reports stale status, and
      recovers automatically.

## 7. Verify the complete data pipeline

- [ ] Start the repository's documented Docker Compose stack when Node-RED is
      needed for the demo.
- [ ] Confirm Node-RED inserts a telemetry observation.
- [ ] Confirm the prediction flow creates the matching `prediction_results`
      row.
- [ ] Confirm `operator_observation_feed` returns the joined result.
- [ ] Confirm the mobile app renders that same result and risk level.
- [ ] Create a small deterministic demo sequence covering low, elevated, and
      high/severe crossing risk.
- [ ] Document how to reset or replay the demo without editing production data.

Verification:

- [ ] Trace one observation ID from Node-RED input through both database tables
      to the selected marker in the app.
- [ ] Values and units match at every boundary.

## 8. Add focused automated tests

- [ ] Unit-test `summarizeTelemetry()` for empty, single, multiple, and nullable
      observations.
- [x] Extract and unit-test risk-color and coordinate/wind-vector helpers.
- [ ] Unit-test the database-row-to-domain mapper, including null prediction and
      null coordinate cases.
- [x] Test repository success and Supabase error behavior with a mocked client.
- [ ] Test the dashboard's loading, empty, ready, stale, and error states.
- [ ] Test marker selection and Retry/Refresh actions.
- [ ] Keep one manual emulator smoke checklist for native map behavior that unit
      tests cannot prove.

Verification:

- [x] `npm test` passes from `apps/operator-mobile`.
- [x] `npm run typecheck` and `npm run lint` still pass.
- [x] `npx expo export --platform android` produces a bundle.

Reference:

- [Expo unit testing documentation](https://docs.expo.dev/develop/unit-testing/)

## 9. Produce a shareable Android preview

- [x] Give the app a stable Android package identifier in Expo config.
- [ ] Replace template icons and splash assets with NOVAflair assets.
- [x] Add the map provider's restricted Android key through build-time
      configuration.
- [x] Configure EAS for an internal Android preview profile, or document an
      equivalent reproducible local APK build.
- [ ] Build and install the preview APK on the target tablet or emulator.
- [ ] Verify the preview build uses the intended Supabase project and contains
      no developer-only credentials.
- [ ] Test cold start, refresh, network loss/recovery, marker selection, and
      landscape layout in the installed build.
- [ ] Add the final operator-mobile setup and demo commands to the root README.
- [ ] Update ADR 0001 follow-up checkboxes to reflect what was actually
      completed.

## 10. Final prototype review

- [ ] Run typecheck, lint, unit tests, and the Android bundle/build.
- [ ] Run the complete Node-RED -> Supabase -> mobile demo once from a clean
      start.
- [ ] Review tracked files for secrets and generated local state.
- [ ] Review the diff for dead mock-runtime paths, temporary fallbacks, and
      obsolete documentation.
- [ ] Record known prototype limitations in the README.
- [ ] Commit the completed prototype as a coherent, reproducible milestone.

## Deferred until after the prototype

- Operator authentication and role-based authorization
- Offline-first cache and queued actions
- Supabase Realtime subscriptions
- Background location or telemetry processing
- Push notifications and critical alerts
- Multiple scenario selection and administration
- iOS build and device-specific polish
- App-store signing, privacy declarations, and release automation
- Production observability, crash reporting, and incident runbooks
