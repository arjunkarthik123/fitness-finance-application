import { WireframeScreen } from '@/components/WireframeScreen';

export default function ProfileScreen() {
  return (
    <WireframeScreen
      title="Profile"
      purpose="Account settings, goals, and connected fitness devices."
      todos={['Edit goals', 'Manage integrations', 'Log out']}
      links={[{ label: 'Log out', href: '/login' }]}
    />
  );
}
