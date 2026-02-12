import type { ProductBusEntry, ProductBusEntryInternal } from "./types";
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
 * @param {ProductBusEntry | ProductBusEntryInternal} product
 * @returns {ProductBusEntry} - Mutated product
 */
export declare function applyImageLookup(product: ProductBusEntry | ProductBusEntryInternal): ProductBusEntry;

/**
 * Check if product has new images not in the internal images lookup
 * @param {ProductBusEntry | ProductBusEntryInternal} product
 * @returns {boolean}
 */
export declare function hasNewImages(product: ProductBusEntry | ProductBusEntryInternal): boolean;

/**
 * @param {Context} ctx
 * @param {string} org
 * @param {string} site
 * @param {ProductBusEntry | ProductBusEntryInternal} product
 * @returns {Promise<ProductBusEntryInternal>}
 */
export declare function extractAndReplaceImages(
  ctx: Context,
  org: string,
  site: string,
  product: ProductBusEntry | ProductBusEntryInternal
): Promise<ProductBusEntryInternal>;
