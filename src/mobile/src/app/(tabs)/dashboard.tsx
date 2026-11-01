import { WireframeScreen } from '@/components/WireframeScreen';

export default function DashboardScreen() {
  return (
    <WireframeScreen
      title="Portfolio Dashboard"
      purpose="Overview of virtual currency balance, portfolio value, and goal progress."
      todos={[
        'Currency balance',
        'Portfolio value and growth chart',
        'Fitness and finance goal progress',
      ]}
      links={[
        { label: 'Log activity', href: '/activity' },
        { label: 'Go to the Exchange', href: '/exchange' },
      ]}
    />
  );
}
