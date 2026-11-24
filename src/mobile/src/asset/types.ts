/** MIS M7 asset identifiers are whole numbers. */
export type AssetId = number;

export type AssetType = 'STOCK' | 'BOND' | 'ETF' | 'FUND';

/** An asset available to trade, including units still available in the market. */
export type Asset = {
  id: AssetId;
  symbol: string;
  name: string;
  type: AssetType;
  startPrice: number;
  yield: number;
  supply: number;
  available: number;
};

export type AssetErrorCode = 'UnknownAsset' | 'InsufficientSupply' | 'NotOutstanding';

export class AssetError extends Error {
  constructor(
    readonly code: AssetErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AssetError';
  }
}

export interface AssetClient {
  getAsset(asset: AssetId): Promise<Asset>;
  getAssets(): Promise<Asset[]>;
  /** Transaction Order only: take units out of the market for a purchase. */
  take(asset: AssetId, qty: number): Promise<Asset>;
  /** Transaction Order only: return units to the market after a sale. */
  release(asset: AssetId, qty: number): Promise<Asset>;
}
