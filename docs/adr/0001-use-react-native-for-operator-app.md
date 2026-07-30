# ADR 0001: Use React Native for the operator app

## Status

Accepted

## Date

2026-06-10

## Owners

Aidan Hoo

## Context

NOVAflair currently has a Vite React web dashboard in `ui/` that reads from Supabase and displays fire telemetry, risk, map, and operational widgets. The project is expanding from a dashboard prototype toward a field-facing product for drone and fire response operations.

The operator experience should eventually run as a full app rather than only as a browser dashboard. The app needs to support field use, touch-first interaction, mobile/tablet layouts, and a future path toward device capabilities that are awkward or unavailable in a web-only UI.

Constraints:

- The current web dashboard already exists and should remain useful while the mobile app is introduced.
- The backend, Supabase schema, Node-RED flows, and telemetry contracts should stay shared instead of being duplicated for each UI.
- The project should stay demo-friendly and maintainable for a small team.
- Native mobile work should not force premature rewrites of the data layer or database schema.

Assumptions:

- The operator app will need iOS and Android support.
- The app will continue to consume the same backend/Supabase data products as the current dashboard.
- The current Vite React UI is a prototype and reference implementation, not the final operator surface.

## Decision

NOVAflair will use React Native as the long-term primary technology for the operator-facing app.

Decision details:

- The existing Vite React dashboard may remain in `ui/` while React Native is introduced.
- The React Native app should consume the same telemetry, prediction, and scenario data contracts as the current dashboard.
- Shared validation rules, API clients, schemas, and types should be factored into shared packages when duplication appears.
- The first React Native implementation should prefer Expo unless a concrete native capability requires a bare React Native setup.
- The mobile app should live at `apps/operator-mobile/` inside this repository instead of becoming a separate Windows-side project.

In scope:

- Choosing React Native as the direction for the operator app.
- Keeping the existing web dashboard available during migration.
- Defining the expectation that the app and dashboard share backend contracts.

Out of scope:

- Moving the existing `ui/` directory in this ADR.
- Selecting a navigation library, state library, or native build service.
- Replacing Supabase, Node-RED, or the backend data model.
- Implementing the React Native app.

## Rationale

React Native fits the next phase of NOVAflair better than a web-only dashboard because the product is becoming a field operator tool, not just a browser visualization.

- It supports a real mobile/tablet app while keeping the team close to the current React skill set.
- It gives a path to native capabilities if the app later needs location, offline storage, notifications, sensors, or device integrations.
- It avoids splitting the frontend into fully separate native codebases for iOS and Android.
- It lets the current dashboard continue to serve as a working prototype while the app matures.

## Design and implementation notes

### Data model

- Supabase and backend SQL remain the source of truth for telemetry, predictions, scenarios, and operational records.
- UI-specific state should stay outside the database unless it represents a durable operator workflow.

### API / interfaces

- The React Native app should use the same data contracts as the web dashboard.
- Shared TypeScript types or generated clients should be introduced when both UIs depend on the same shape.
- App-specific platform behavior should live at the app boundary, not inside backend schema changes.

### Security and privacy

- The app must use browser-safe or mobile-safe credentials only.
- Service role keys and backend-only secrets must not ship in the React Native bundle.
- Any future device permissions should be requested only when a feature needs them.

### Operations

- The current Vite app can continue to be built and deployed while React Native is developed.
- React Native build and release automation should be added only when there is a real app target to ship.

### Local Android development

- Android Studio should be treated as the Android SDK, emulator, and AVD management tool, not as the required code editor.
- On Windows developer machines, the Android Emulator should run on Windows through Android Studio.
- Repository source, package manager commands, tests, and app development commands should continue to run from WSL for this repo.
- WSL should be configured to communicate with the Windows Android Debug Bridge (`adb`) server so the WSL-based React Native or Expo dev server can install and open the app on the Windows-hosted emulator.
- Duplicating the mobile project onto the Windows filesystem is acceptable only for disposable toolchain experiments. It should not become the authoritative implementation path for NOVAflair.
- A tablet Android Virtual Device is an appropriate first target because the operator app is expected to be a field console. Phone and physical-device testing should be added before release.
- The first mobile milestone should render a static or fake-data operator console before integrating backend, Supabase, Node-RED, or hardware data.

## Consequences

Positive:

- The operator experience can become a real mobile/tablet app.
- The team can reuse React knowledge from the current dashboard.
- Future native capabilities remain available without abandoning the existing frontend direction.
- The web dashboard can continue to support demos and development while the app is built.

Negative:

- The project will eventually have two frontend surfaces unless the web dashboard is retired.
- Shared data contracts will need more discipline as both UIs evolve.
- React Native introduces mobile build, packaging, and device testing concerns.

Follow-ups:

- [x] Verify a Windows Android Emulator can be reached from WSL through `adb`.
- [x] Create the first React Native app with Expo unless a specific native requirement blocks it.
- [x] Add the app at `apps/operator-mobile/` when implementation starts.
- [ ] Identify shared dashboard/app data contracts that should move into a shared package.
- [ ] Decide when the Vite dashboard becomes secondary, internal-only, or retired.

## Alternatives considered

1. Keep the product as a Vite React web dashboard
   - Why not: it is simpler now, but it does not match the intended field app direction as well.

2. Build separate native iOS and Android apps
   - Why not: it adds too much implementation and maintenance cost for the current team and project stage.

3. Build a Progressive Web App
   - Why not: it could improve installability, but it still leaves native device integration and app distribution weaker than React Native.

## Rollout plan

1. Keep the current Vite dashboard running as the reference UI.
2. Confirm the Android Studio emulator and WSL `adb` workflow before adding app code.
3. Start an Expo React Native app in `apps/operator-mobile/` when the first app-specific workflow is ready.
4. Build the first operator-console screen with fake telemetry and prediction data.
5. Share types, validation, and API clients once duplication appears between the web and mobile UIs.
6. Move operator-facing workflows into the React Native app over time.
7. Decide whether the web dashboard remains as an internal/admin surface or is retired.
