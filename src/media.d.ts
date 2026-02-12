import type { ProductBusEntry } from "./types";
import type { Context } from "./types/context";

/**
 * @param {string} pathOrUrl
 * @returns {boolean}
 */
export declare function isRelativePath(pathOrUrl: string): boolean;

/**
 * @param {string} url
 * @returns {boolean}
 */
export declare function isValidURL(url: string): boolean;

/**
 * Apply image lookup to a product, replacing external URLs with hashed URLs
 * @param {ProductBusEntry} product
 * @param {Record<string, string>} imageLookup
 * @returns {ProductBusEntry} - Mutated product
 */
export declare function applyImageLookup(product: ProductBusEntry, imageLookup: Record<string, string>): ProductBusEntry;

/**
 * Check if product has new images not in the lookup table
 * @param {ProductBusEntry} product
 * @param {Record<string, string>} imageLookup
 * @returns {boolean}
 */
export declare function hasNewImages(product: ProductBusEntry, imageLookup: Record<string, string>): boolean;

/**
 * @param {Context} ctx
 * @param {string} org
 * @param {string} site
 * @param {ProductBusEntry} product
 * @param {Record<string, string>} [existingLookup] - Existing image lookup table
 * @returns {Promise<{product: ProductBusEntry, imageLookup: Record<string, string>}>}
 */
export declare function extractAndReplaceImages(
  ctx: Context,
  org: string,
  site: string,
  product: ProductBusEntry,
  existingLookup?: Record<string, string>
): Promise<{ product: ProductBusEntry, imageLookup: Record<string, string> }>;


