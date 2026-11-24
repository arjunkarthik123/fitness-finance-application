import { render, screen } from '@testing-library/react-native';

import { PriceBars } from '@/components/ui';

const at = (minute: number, price: number) => ({
  asset: 1,
  time: new Date(minute * 60_000),
  price,
});

it('draws only the newest maxBars prices', async () => {
  const points = Array.from({ length: 50 }, (_, i) => at(i, 10 + i));
  await render(<PriceBars points={points} maxBars={30} />);
  expect(screen.getAllByTestId('price-bar-up')).toHaveLength(30);
});

it('marks a fall from the tick before', async () => {
  await render(<PriceBars points={[at(0, 10), at(1, 12), at(2, 9)]} />);
  expect(screen.getAllByTestId('price-bar-up')).toHaveLength(2);
  expect(screen.getAllByTestId('price-bar-down')).toHaveLength(1);
});
