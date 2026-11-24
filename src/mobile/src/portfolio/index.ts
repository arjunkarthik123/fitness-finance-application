/**
 * Portfolio (MIS M9): what the user holds, what they paid for it and the
 * gain or loss on each asset over its lifetime. Units are whole shares;
 * amounts are FLX with at most two decimal places, like the Currency Ledger.
 *
 * Screens use `portfolio` only. By default it runs on the device
 * (`local.ts`). Set EXPO_PUBLIC_BACKEND=api in `.env` to send the same calls
 * to the Spring API instead (`remote.ts`, endpoints in PORTFOLIO_ENDPOINTS).
 * Screens don't change either way.
 *
 * getUnits, addUnits and removeUnits are backend-only (MIS: not available
 * through the API). Only the Transaction Order module calls them, in the same
 * transaction as its ledger debit or credit.
 *
 * Differences from the MIS for the PoC:
 * - One user per device, so there is no UserID, create, NoPortfolio or `opened`.
 * - Prices come from the Market Simulation POC (`@/market`).
 * - There is no getValueHistory yet: it needs past prices and earnings over time.
 */
import { localPortfolio } from './local';
import { remotePortfolio } from './remote';
import type { PortfolioClient } from './types';

export const portfolio: PortfolioClient =
  process.env.EXPO_PUBLIC_BACKEND === 'api' ? remotePortfolio : localPortfolio;

export { addUnits, costOf, getUnits, removeUnits } from './local';
export { PORTFOLIO_ENDPOINTS } from './remote';
export {
  PortfolioError,
  type AssetId,
  type Holding,
  type HoldingsOptions,
  type PortfolioClient,
  type PortfolioErrorCode,
  type Summary,
} from './types';
