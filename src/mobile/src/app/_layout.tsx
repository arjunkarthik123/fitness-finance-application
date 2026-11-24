import { Stack } from 'expo-router';
import { LogBox } from 'react-native';

import { BalanceBadge, BalanceProvider } from '@/components/Balance';
import { showDevTools } from '@/config/devTools';

// With dev tools off (e.g. recording the demo), hide the dev-build warning toasts too.
if (__DEV__ && !showDevTools) {
  LogBox.ignoreAllLogs();
}

// "Reset demo data" in the Expo dev menu, even with dev tools off. Release builds drop it.
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/dev/devMenu').registerDemoDevMenu();
}

export default function RootLayout() {
  return (
    <BalanceProvider>
      <Stack screenOptions={{ headerRight: () => <BalanceBadge /> }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="invest/[symbol]" options={{ title: 'Investment' }} />
        <Stack.Screen name="order" options={{ title: 'Market Order', presentation: 'modal' }} />
        <Stack.Screen name="health-privacy" options={{ title: 'Health data & privacy' }} />
      </Stack>
    </BalanceProvider>
  );
}
