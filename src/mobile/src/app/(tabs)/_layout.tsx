import { Tabs } from 'expo-router';

import { BalanceBadge } from '@/components/Balance';

/** Tabs in demo order. Dashboard and Profile are wireframes, so they stay hidden for now. */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerRight: () => <BalanceBadge /> }}>
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals' }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio' }} />
      <Tabs.Screen name="exchange" options={{ title: 'Exchange' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', href: null }} />
    </Tabs>
  );
}
