import { openHealthConnectSettings } from 'react-native-health-connect';
import { Platform } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';

/**
 * Explains what Flexin reads from Health Connect and why. Health Connect requires
 * this rationale; it is reached from the Activity tab before connecting.
 */
export default function HealthPrivacyScreen() {
  return (
    <Screen>
      <AppText variant="heading">What Flexin reads</AppText>
      <AppText>• Steps{'\n'}• Exercise sessions (type, start and end time)</AppText>

      <AppText variant="heading">Why</AppText>
      <AppText>
        Your activity is how you earn virtual currency and track progress towards your fitness
        goals. Flexin only counts activity recorded automatically by your phone or a connected
        device, never manually entered data.
      </AppText>

      <AppText variant="heading">What Flexin does not do</AppText>
      <AppText>
        Flexin never writes to Health Connect and does not read any other health data. Your activity
        is not shared with third parties.
      </AppText>

      <AppText variant="heading">Your control</AppText>
      <AppText>
        You can change or revoke Flexin&apos;s access at any time in Health Connect.
      </AppText>
      {Platform.OS === 'android' && (
        <Button label="Open Health Connect settings" onPress={() => openHealthConnectSettings()} />
      )}
    </Screen>
  );
}
