/**
 * Portfolio (MIS M9): what the user holds, what they paid for it and the
 * gain or loss on each asset over its lifetime. For the PoC it is stored on
 * the device through `@/persistence`.
 *
 * Differences from the MIS for the PoC:
 * - One user per device, so there is no UserID, create or NoPortfolio.
 * - Prices are passed in (a PriceLookup) until the Market Simulation module exists.
 * - There is no getValueHistory yet: it needs past prices from Market Simulation.
 *
 * Units are whole shares; amounts are FLX with at most two decimal places,
 * like the Currency Ledger.
 *
 * Only the Transaction Order flow should call addUnits and removeUnits, in the
 * same transaction as its ledger debit or credit.
 */
export {
  addUnits,
  costOf,
  getHolding,
  getHoldings,
  getSummary,
  getUnits,
  PortfolioError,
  removeUnits,
  type AssetId,
  type Holding,
  type PortfolioErrorCode,
  type PriceLookup,
  type Summary,
} from './portfolio';
