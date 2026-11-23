/**
 * Asset Module (MIS M7).
 *
 * The POC uses a hard-coded catalogue and derives available supply from
 * outstanding units held in the portfolio. Screens import `asset` only.
 */
import { localAsset } from './local';
import type { AssetClient } from './types';

export const asset: AssetClient = localAsset;

export { ASSETS } from './local';
export { AssetError, type Asset, type AssetClient, type AssetId, type AssetType } from './types';
