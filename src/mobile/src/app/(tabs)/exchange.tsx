import { WireframeScreen } from '@/components/WireframeScreen';

export default function ExchangeScreen() {
  return (
    <WireframeScreen
      title="The Flexin' Exchange"
      purpose="Browse owned investments, IPOs, and other options, plus market trends by type."
      todos={[
        'Current owned investments',
        'IPOs and newly issued stocks',
        'Market trends by type (bonds, ETFs, stocks)',
        'Terminology tooltips',
      ]}
      links={[{ label: 'View sample investment', href: '/invest/FLEX' }]}
    />
  );
}
