# Installing Flexin for development

See [src/README.md](src/README.md) for how the code is organized.

## Prerequisites

| Tool | Version | Used for |
| --- | --- | --- |
| [mise](https://mise.jdx.dev) (recommended) | latest | Installs the pinned Node and Java versions |
| Node.js | 22 | Mobile app |
| Java (Temurin) | 21 | API |
| MySQL | 9 (or Docker) | Dev database |
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

Option A, Docker:

```sh
cd src
docker compose up -d
```

Option B, local MySQL 9 install. Create the database and user that the dev profile expects:

```sql
CREATE DATABASE flexin;
CREATE USER 'flexin'@'localhost' IDENTIFIED BY 'flexin';
GRANT ALL PRIVILEGES ON flexin.* TO 'flexin'@'localhost';
```

To use different credentials, set `DB_URL`, `DB_USER` and `DB_PASSWORD` before starting the API.

## 3. API

```sh
cd src/api
./mvnw spring-boot:run      # http://localhost:8080/actuator/health
./mvnw verify               # tests (H2, no database needed) + Checkstyle
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

## Uninstall

```sh
cd src && docker compose down -v                # stop MySQL and delete its data
rm -rf src/mobile/node_modules src/api/target   # remove installed dependencies and builds
mise uninstall --all                            # remove the mise-installed Node/Java
```

For a local MySQL install, drop the database with `DROP DATABASE flexin; DROP USER 'flexin'@'localhost';`.
