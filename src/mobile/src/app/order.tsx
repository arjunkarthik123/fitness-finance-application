import { useLocalSearchParams } from 'expo-router';

import { WireframeScreen } from '@/components/WireframeScreen';

export default function OrderScreen() {
  const { symbol, side } = useLocalSearchParams<{ symbol: string; side: 'buy' | 'sell' }>();
  return (
    <WireframeScreen
      title={`${side === 'sell' ? 'Sell' : 'Buy'} ${symbol}`}
      purpose="Set up a market order using virtual currency."
      todos={['Quantity input', 'Cost preview in virtual currency', 'Confirm and submit order']}
      links={[{ label: 'Back to Exchange', href: '/exchange' }]}
    />
  );
}
