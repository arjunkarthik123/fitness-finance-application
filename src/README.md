# Flexin Source Code

The stack follows Section 11 (Expected Technology) of the
[Development Plan](../docs/DevelopmentPlan/DevelopmentPlan.tex). Setup steps are in
[INSTALL.md](../INSTALL.md).

| Folder | What | Stack |
| --- | --- | --- |
| [`mobile/`](mobile) | The app | Expo (React Native) + TypeScript, Expo Router, ESLint, Prettier, Jest, Detox |
| [`api/`](api) | Backend API | Spring Boot 4 (Java 21), Spring Data JPA, Liquibase, JUnit 5, Checkstyle |
| [`docker-compose.yml`](docker-compose.yml) | Local database | MySQL 9 |

Tool versions (Node, Java) are pinned in [`/mise.toml`](../mise.toml). Maven is pinned by
`api/mvnw`.

## Quick start

```sh
mise install          # once, installs Node 22 + Java 21
mise run db           # start MySQL (or use a local MySQL install, see INSTALL.md)
mise run api          # API on http://localhost:8080 (try /actuator/health)
mise run mobile       # Expo dev server; press w for web, a for Android
mise run test         # everything CI runs
```

Without mise, run the same commands from each folder: `npm start` / `npm test` in `mobile/`,
`./mvnw spring-boot:run` / `./mvnw verify` in `api/`.

## mobile/

```
src/app/                 Screens. Every file is a route (Expo Router).
  (auth)/                Login, register, onboarding questionnaires
  (tabs)/                Dashboard, Activity, Exchange, Profile
  invest/[symbol].tsx    Investment detail
  order.tsx              Buy/sell market order
src/components/          Shared UI (WireframeScreen is the placeholder used by every screen)
src/services/api.ts      Typed client for the API (reads EXPO_PUBLIC_API_URL)
src/integrations/        Health Connect, Strava, Garmin stubs behind one FitnessIntegration interface
src/theme/               Colors and spacing tokens (replace with values from Figma)
__tests__/               Jest unit tests
e2e/                     Detox end-to-end tests
```

Every screen is currently a **wireframe stub** built from the flowcharts in
[`assets/images`](../assets/images). Each shows its purpose, a TODO list, and buttons to the
next screens, so the whole flow can be clicked through. Replace `<WireframeScreen>` with the
real UI as each screen gets built.

- Add packages with `npx expo install <pkg>` (not `npm install`) so versions match the Expo SDK.
- Health Connect, Garmin and Detox need native code, so they need a **dev build**
  (`npx expo run:android`), not Expo Go. The generated `android/` and `ios/` folders are not
  committed.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run format`.

### Installing the dev build

Health Connect is built into Android 14 and later. On older phones, install the Health Connect
app from the Play Store first.

1. **Turn on USB debugging.** Settings → About phone, tap **Build number** 7 times (on Samsung
   it is under Software information). Then Developer options → **USB debugging**.
2. **Plug the phone in** and accept the "Allow USB debugging?" prompt. If no prompt appears,
   set the USB mode to File transfer or try another cable. `adb devices` should list the phone
   as `device`.
3. **Build and install** from `src/mobile`:

   ```sh
   npx expo run:android --device
   ```

   The first build takes 5–10 minutes. Samsung phones may ask to allow the install over USB.
   This also starts Metro.
4. **Point the phone at Metro.** If the app says it can't reach the development server, run
   `adb reverse tcp:8081 tcp:8081` and open `http://localhost:8081` in the dev client.
   Run it again whenever the phone is reconnected.
5. **Try it.** Activity tab → **Connect** → grant access → **Sync**. On a device with no real
   steps (a tablet, an emulator), use **Seed test data** on the same screen to write a week of
   sample steps, including one manual entry that should not count. **Clear test data** removes
   only records this app wrote. Clear it before comparing against real steps, because the seed
   writes records for today too.

To check the result, compare the app's totals with Health Connect → Data and access →
Activity → Steps. Match against Health Connect, not the source app: Samsung Health writes to
Health Connect in batches, so it can be a little ahead.

### Detox (not wired up yet)

`.detoxrc.js`, `e2e/jest.config.js` and a smoke test are in place. The community
`@config-plugins/detox` plugin only supports up to Expo SDK 53, and this app is on SDK 58,
so the native Android test runner is not generated yet. Until that is solved (a small local
config plugin, or a newer community plugin), `npm run e2e:*` will not work and CI does not
run Detox.

## api/

```
src/main/java/ca/flexin/api/
  common/      Health endpoint, shared code
  config/      Security (currently permits everything, TODO: auth)
  user/        Example feature: entity, repository, service, controller, DTO. Copy this layout.
  fitness/     Workouts and activity verification (empty)
  currency/    Virtual currency ledger (empty)
  portfolio/   Holdings and orders (empty)
  market/      Listings and trends (empty)
src/main/resources/
  application.yml            Default profile is dev (MySQL from DB_URL / DB_USER / DB_PASSWORD)
  db/changelog/              Liquibase changelogs
src/test/                    JUnit tests; run on in-memory H2 with the `test` profile (real MySQL in CI)
```

### Database migrations (Liquibase)

The schema is owned by Liquibase, and Hibernate only validates against it (`ddl-auto: validate`).

1. Add a file under `db/changelog/changes/`, numbered next in order (e.g. `002-create-activities.yaml`).
2. Include it at the bottom of `db.changelog-master.yaml`.
3. Write changesets in YAML (not raw SQL) so they run on both MySQL and H2, and add a `rollback`.
4. **Never edit a changeset that is already on main.** Write a new one instead.

The app applies changes on startup. You can also run them by hand against the dev DB:

```sh
./mvnw liquibase:status
./mvnw liquibase:update
./mvnw liquibase:rollback -Dliquibase.rollbackCount=1
```

## CI

[`.github/workflows/app-ci.yml`](../.github/workflows/app-ci.yml) runs on PRs that touch
`src/`. It runs lint, typecheck, format check and Jest for mobile, and `mvnw verify` (tests +
Checkstyle) for the API.
