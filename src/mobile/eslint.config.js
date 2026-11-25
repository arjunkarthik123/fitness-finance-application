// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*'],
  },
  {
    // All storage goes through src/persistence (MIS M2), so only it may touch the database.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/persistence/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'expo-sqlite', message: 'Use @/persistence instead.' }],
          patterns: [
            {
              group: ['@/persistence/*', '**/persistence/*'],
              message: 'Import from @/persistence, not its files.',
            },
            {
              // Dev tools load only through a showDevTools-guarded require (src/config/devTools.ts).
              group: ['@/components/dev/*', '**/components/dev/*'],
              message: 'Load dev tools with a showDevTools-guarded require, not an import.',
            },
          ],
        },
      ],
    },
  },
]);
