import { Redirect } from 'expo-router';

// PoC: one demo user and no login yet, so open straight on the Activity tab.
// TODO: send signed-out users to /login once auth exists.
export default function Index() {
  return <Redirect href="/activity" />;
}
