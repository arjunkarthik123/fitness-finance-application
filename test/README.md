# Automated tests

Tests live next to the code they test:

- Mobile unit tests: `src/mobile/__tests__/` (Jest + React Native Testing Library), run with `npm test`
- Mobile end-to-end tests: `src/mobile/e2e/` (Detox), run with `npm run e2e:test`
- API tests: `src/api/src/test/` (JUnit 5, H2 in-memory DB), run with `./mvnw verify`

CI runs the unit and API tests on every pull request that touches `src/`
(see `.github/workflows/app-ci.yml`).
