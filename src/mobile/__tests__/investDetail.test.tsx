import * as expoSqlite from 'expo-sqlite';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import ExchangeScreen from '@/app/(tabs)/exchange';
import InvestmentDetailScreen from '@/app/invest/[symbol]';
import { asset } from '@/asset';
import { resetLocalAssetState } from '@/asset/local';
import { tick } from '@/market';
import { resetMarket } from '@/market/local';
import { closeDatabase } from '@/persistence/database';

const sqlite = expoSqlite as unknown as typeof import('../__mocks__/expo-sqlite');

const routes = { exchange: ExchangeScreen, 'invest/[symbol]': InvestmentDetailScreen };

let draws: number[];

beforeEach(async () => {
  await closeDatabase();
  sqlite.__resetAllDatabases();
  resetLocalAssetState();
  // Open the in-memory database now: its first open is slower than findBy* waits.
  await asset.getAssets();
  draws = [];
  // Each tick takes one draw per asset (FLEX, STRD, RUN, GAIN). 0.5 → factor 1.0.
  resetMarket({ now: () => new Date(Date.UTC(2026, 0, 1)), random: () => draws.shift() ?? 0.5 });
});

it('opens an asset from the Exchange', async () => {
  const screen = await renderRouter(routes, { initialUrl: '/exchange' });
  await fireEvent.press(await screen.findByTestId('asset-link-FLEX'));
  expect(await screen.findByTestId('invest-FLEX')).toBeOnTheScreen();
  expect(screen).toHavePathname('/invest/FLEX');
});

it('shows growth since the start, a bar per tick and the recent ticks', async () => {
  draws = [0.75, 0.5, 0.5, 0.5, 0, 0.5, 0.5, 0.5]; // FLEX × 1.1, then × 0.8
  tick();
  tick();

  const screen = await renderRouter(routes, { initialUrl: '/invest/FLEX' });

  // 12.50 → 13.75 → 11.00
  expect(await screen.findByText('11.00 FLX')).toBeOnTheScreen();
  expect(screen.getByTestId('growth')).toHaveTextContent('Started at 12.50 FLX · −12.0%');
  expect(screen.getAllByTestId(/^price-bar-/)).toHaveLength(3);
  expect(screen.getAllByTestId('price-bar-down')).toHaveLength(1);

  const rows = screen.getAllByTestId('tick-row');
  expect(rows).toHaveLength(3);
  expect(rows[0]).toHaveTextContent(/11\.00.*−20\.0%/);
  expect(rows[2]).toHaveTextContent(/12\.50.*start/);
});

it('shows a not-found screen for an unknown symbol', async () => {
  const screen = await renderRouter(routes, { initialUrl: '/invest/XYZ' });
  expect(await screen.findByText('Asset not found')).toBeOnTheScreen();
  expect(screen.getByRole('link', { name: 'Back to Exchange' })).toBeOnTheScreen();
});
