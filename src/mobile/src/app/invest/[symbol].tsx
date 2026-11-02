import { useLocalSearchParams } from 'expo-router';

import { WireframeScreen } from '@/components/WireframeScreen';

export default function InvestmentDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  return (
    <WireframeScreen
      title={symbol}
      purpose="Current and projected finances, stock growth, and spreads for one investment."
      todos={['Price history chart', 'Projected growth', 'Current spread']}
      links={[
        { label: 'Buy', href: { pathname: '/order', params: { symbol, side: 'buy' } } },
        { label: 'Sell', href: { pathname: '/order', params: { symbol, side: 'sell' } } },
      ]}
    />
  );
}
