/**
 * DEV ONLY. Adds "Reset demo data" to the Expo dev menu (shake the phone), so a
 * demo take can restart from zero even with the on-screen dev tools switched
 * off. It deletes the on-device database (steps, ledger, holdings, goal
 * rewards), then reloads the JavaScript, which also resets market prices and
 * asset stock. Health Connect access is kept. Only loaded under `__DEV__`
 * (see src/app/_layout.tsx); release builds have no dev menu.
 */
import { registerDevMenuItems } from 'expo-dev-client';
import { DevSettings } from 'react-native';

import { resetDatabase } from '@/persistence';

export function registerDemoDevMenu(): void {
  void registerDevMenuItems([
    {
      name: 'Reset demo data',
      shouldCollapse: true,
      callback: () => {
        void resetDatabase().then(() => DevSettings.reload());
      },
    },
  ]);
}
