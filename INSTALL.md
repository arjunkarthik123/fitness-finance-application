# Installing Flexin for development

See [src/README.md](src/README.md) for how the code is organized.

## Prerequisites

| Tool | Version | Used for |
| --- | --- | --- |
| [mise](https://mise.jdx.dev) (recommended) | latest | Installs the pinned Node and Java versions |
| Node.js | 22 | Mobile app |
| Java (Temurin) | 21 | API |
| MySQL | 8.4 or 9 (or Docker) | Dev database, one per developer |
| Android Studio + an emulator | latest | Running dev builds and Detox |

Maven does not need to be installed; `src/api/mvnw` downloads the right version.

## 1. Install the toolchain with mise

mise is free and open source (MIT).

```sh
# Windows
winget install jdx.mise
# macOS
brew install mise
# Linux
curl https://mise.run | sh
```

Then [activate mise in your shell](https://mise.jdx.dev/getting-started.html#activate-mise)
and, from the repo root:

```sh
mise trust
mise install
```

If you'd rather not use mise, install Node 22 and a JDK 21 yourself. Everything else works
the same.

## 2. Database

Everyone runs their **own** local MySQL with their own `flexin` database. There is no shared
database to connect to, and nothing to copy from a teammate: the API creates and updates the
tables itself on startup using Liquibase (changesets in
`src/api/src/main/resources/db/changelog/`). Pull, start the API, and your schema matches
everyone else's.

You only need MySQL to *run* the API. The tests (`./mvnw verify`) use in-memory H2 and need no
database.

### Option A: Docker

```sh
mise run db                 # or: cd src && docker compose up -d
```

This starts MySQL 9 with the `flexin` database and user already created. Skip to step 3.

### Option B: install MySQL directly (no Docker)

MySQL 8.4 or 9 both work.

1. Install it:

   ```sh
   # Windows (MySQL 8.4 LTS)
   winget install Oracle.MySQL
   # macOS
   brew install mysql && brew services start mysql
   # Ubuntu/Debian
   sudo apt install mysql-server
   ```

   On Windows, **MySQL Configurator** opens at the end of the install (if not, find it in the
   Start menu). Keep port **3306**, set a root password, and leave "Configure MySQL Server as a
   Windows Service" checked so it starts automatically.

2. Open a MySQL prompt as root ("MySQL 8.4 Command Line Client" in the Windows Start menu, or
   `mysql -u root -p` / `sudo mysql` elsewhere) and create the database and user the dev profile
   expects:

   ```sql
   CREATE DATABASE flexin;
   CREATE USER 'flexin'@'localhost' IDENTIFIED BY 'flexin';
   GRANT ALL PRIVILEGES ON flexin.* TO 'flexin'@'localhost';
   ```

To use different credentials, set `DB_URL`, `DB_USER` and `DB_PASSWORD` before starting the API.

## 3. API

```sh
mise run api                # or: cd src/api && ./mvnw spring-boot:run  (Windows: .\mvnw.cmd)
```

Open <http://localhost:8080/actuator/health>; `{"status":"UP"}` means the API is running and
connected to MySQL. The first start creates the tables (the log shows Liquibase running the
changesets); later starts only apply new ones.

```sh
mise run test:api           # or: cd src/api && ./mvnw verify   tests (H2) + Checkstyle
```

CI runs the same tests against real MySQL. To do that locally, point the tests at a MySQL database
(it can be the `flexin` one above; repository tests roll back their data):

```sh
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/flexin SPRING_DATASOURCE_USERNAME=flexin SPRING_DATASOURCE_PASSWORD=flexin ./mvnw verify
```

## 4. Mobile app

```sh
cd src/mobile
npm install
cp .env.example .env        # points the app at the API
npm start                   # press w for web, a for Android
```

## Troubleshooting

- **`mise`, `gh`, `mysql` etc. "not recognized" right after installing.** Your terminal still has
  the old PATH. Fully quit and reopen the terminal, including the app that hosts it (IntelliJ,
  VS Code, Windows Terminal); a new tab inside it isn't enough.
- **`Port 8080 was already in use`.** Something else is listening on 8080. Stop it, or run the
  API on another port with `SERVER_PORT=8082` and set `EXPO_PUBLIC_API_URL` in
  `src/mobile/.env` to match. Avoid 8081, which the Expo dev server uses.
- **`Communications link failure` / `Access denied for user 'flexin'` on API start.** MySQL isn't
  running, or the `flexin` database/user from step 2 wasn't created.
- **`npm run format:check` fails on Windows on files you didn't touch.** Your checkout has CRLF
  line endings from before `.gitattributes` was added. With no uncommitted work, run once from
  the repo root: `git rm --cached -r -q . && git reset --hard`.
- **IntelliJ doesn't resolve Java classes (Ctrl+click does nothing).** Right-click
  `src/api/pom.xml` and choose **Add as Maven Project**. If the import fails with
  `No implementation for ArtifactHandlerManager was bound`, set **Settings → Build Tools → Maven
  → Maven home path** to **Bundled (Maven 3)** and reload.

## Uninstall

```sh
cd src && docker compose down -v                # stop MySQL and delete its data
rm -rf src/mobile/node_modules src/api/target   # remove installed dependencies and builds
mise uninstall --all                            # remove the mise-installed Node/Java
```

For a local MySQL install, drop the database with `DROP DATABASE flexin; DROP USER 'flexin'@'localhost';`.
