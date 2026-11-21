/**
 * The Portfolio over HTTP (BACKEND=api): each call is a request to the Spring
 * API (`src/api`, package `portfolio/`). The backend returns the same JSON
 * shapes as `types.ts`.
 *
 * The paths below are a proposal for the backend team. If the controller uses
 * different ones, change them here only.
 */
import { apiFetch } from '@/services/api';

import type { AssetId, Holding, HoldingsOptions, PortfolioClient, Summary } from './types';

export const PORTFOLIO_ENDPOINTS = {
  /** GET → Holding[]. `?includeSold=true` also returns assets sold out. */
  holdings: '/api/portfolio/holdings',
  /** GET → Holding. */
  holding: (asset: AssetId) => `/api/portfolio/holdings/${encodeURIComponent(asset)}`,
  /** GET → Summary. */
  summary: '/api/portfolio/summary',
} as const;

export const remotePortfolio: PortfolioClient = {
  getHoldings: (options: HoldingsOptions = {}) =>
    apiFetch<Holding[]>(
      options.includeSold
        ? `${PORTFOLIO_ENDPOINTS.holdings}?includeSold=true`
        : PORTFOLIO_ENDPOINTS.holdings,
    ),
  getHolding: (asset) => apiFetch<Holding>(PORTFOLIO_ENDPOINTS.holding(asset)),
  getSummary: () => apiFetch<Summary>(PORTFOLIO_ENDPOINTS.summary),
};
