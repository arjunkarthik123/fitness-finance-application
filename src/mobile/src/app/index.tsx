import { Redirect } from 'expo-router';

// TODO: send signed-in users to /dashboard once auth exists.
export default function Index() {
  return <Redirect href="/login" />;
}
