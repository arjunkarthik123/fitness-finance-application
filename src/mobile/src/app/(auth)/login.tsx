import { WireframeScreen } from '@/components/WireframeScreen';

export default function LoginScreen() {
  return (
    <WireframeScreen
      title="Log In"
      purpose="Log in to an existing account, or start registering a new one."
      todos={['Username and password fields', 'Retry on invalid credentials', 'Call auth API']}
      links={[
        { label: 'Log in (skip to app)', href: '/dashboard', replace: true },
        { label: 'Register new account', href: '/register' },
      ]}
    />
  );
}
