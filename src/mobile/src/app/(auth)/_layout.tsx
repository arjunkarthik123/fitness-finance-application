import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Log In' }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
      <Stack.Screen
        name="onboarding/finance-questionnaire"
        options={{ title: 'Finance Questions' }}
      />
      <Stack.Screen
        name="onboarding/fitness-questionnaire"
        options={{ title: 'Fitness Questions' }}
      />
    </Stack>
  );
}
