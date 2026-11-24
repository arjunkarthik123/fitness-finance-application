/**
 * One switch for every dev-only tool (seed data, reset, test steps, test
 * trades). On in development builds unless `.env` sets
 * `EXPO_PUBLIC_DEV_TOOLS=off`, e.g. to record the demo; restart Metro with
 * `npx expo start --clear` after changing it. Always off in release builds,
 * and because it starts with `__DEV__`, the release bundler drops the tools.
 *
 * Load dev tools only through this flag, as a guarded `require`:
 *
 *   const Tool = showDevTools ? require('@/components/dev/Tool').Tool : null;
 */
export const showDevTools = __DEV__ && process.env.EXPO_PUBLIC_DEV_TOOLS !== 'off';
