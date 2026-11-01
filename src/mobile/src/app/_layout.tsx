import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="invest/[symbol]" options={{ title: 'Investment' }} />
      <Stack.Screen name="order" options={{ title: 'Market Order', presentation: 'modal' }} />
    </Stack>
  );
}
