import { WireframeScreen } from '@/components/WireframeScreen';

export default function RegisterScreen() {
  return (
    <WireframeScreen
      title="Register"
      purpose="Enter a valid username and password to create an account."
      todos={['Username and password fields with validation', 'Retry if invalid']}
      links={[{ label: 'Continue', href: '/onboarding/finance-questionnaire' }]}
    />
  );
}
