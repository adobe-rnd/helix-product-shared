import { ProductBusEntry } from "./types";
import { Context } from "./types/context";

/**
 * @param {string} pathOrUrl
 * @returns {boolean}
 */
export declare function isRelativePath(pathOrUrl: string): boolean;

/**
 * @param {Context} ctx
 * @param {string} org
 * @param {string} site
 * @param {SharedTypes.ProductBusEntry} product
 * @returns {Promise<SharedTypes.ProductBusEntry>}
 */
export declare function extractAndReplaceImages(ctx: Context, org: string, site: string, product: ProductBusEntry): Promise<ProductBusEntry>;

