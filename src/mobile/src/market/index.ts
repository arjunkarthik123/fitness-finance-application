/**
 * Market Simulation (MIS M14): the current price of every asset, owned or
 * not. The Portfolio values holdings with it, the Exchange lists it and
 * Transaction Order trades at it.
 *
 * Differences from the MIS for the POC:
 * - Prices move by a random factor between 0.8 and 1.2 each tick instead of
 *   the calibrated model, and there are no market events or dividends.
 * - Ticks catch up when a price is read instead of running on a scheduler.
 * - State is kept in memory, not through the Persistence module.
 */
export {
  getHistory,
  getPrice,
  getPrices,
  init,
  MAX_FACTOR,
  MIN_FACTOR,
  MIN_PRICE,
  TICK_INTERVAL_MS,
  tick,
} from './local';
export { MarketError, type MarketErrorCode, type PricePoint, type TickFactor } from './types';
