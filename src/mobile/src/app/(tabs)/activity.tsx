import { WireframeScreen } from '@/components/WireframeScreen';

export default function ActivityScreen() {
  return (
    <WireframeScreen
      title="Activity"
      purpose="Track workouts and see the virtual currency they earned."
      todos={[
        'Recent workouts from device, Health Connect, Strava, Garmin',
        'Currency earned per workout',
        'Connected devices',
      ]}
    />
  );
}
