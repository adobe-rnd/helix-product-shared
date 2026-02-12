import { R2Bucket } from "@cloudflare/workers-types";
import * as SharedTypes from './types';
import type { Context } from "./types/context";
import type { MediaData } from "./types/media.js";

export declare class StorageClient {
  constructor(ctx: Context);
  static fromContext(ctx: Context): StorageClient;
  ctx: Context;

  bucket: R2Bucket;

  /**
   * Put data into storage.
   * 
   * @param {string}key 
   * @param {Parameters<R2Bucket['put']>[1]} data 
   * @param {Parameters<R2Bucket['put']>[2]} options 
   * @returns {Promise<ReturnType<R2Bucket['put']>>}
   */
  put(key: string, data: Parameters<R2Bucket['put']>[1], options?: Parameters<R2Bucket['put']>[2]): Promise<ReturnType<R2Bucket['put']>>;

  /**
   * Put data into storage.
   * 
   * @param {R2Bucket} bucket
   * @param {string} key 
   * @param {Parameters<R2Bucket['put']>[1]} data 
   * @param {Parameters<R2Bucket['put']>[2]} options 
   * @returns {Promise<ReturnType<R2Bucket['put']>>}
   */
  putTo(bucket: R2Bucket, key: string, data: Parameters<R2Bucket['put']>[1], options?: Parameters<R2Bucket['put']>[2]): Promise<ReturnType<R2Bucket['put']>>;

  /**
   * Save image for a site.
   * Uses org/site instead of catalogKey since media resources are shared between stores/views.
   *
   * @param {Context} ctx
   * @param {string} org
   * @param {string} site
   * @param {MediaData} image
   * @returns {Promise<string>} new filename
   */
  saveImage(ctx: Context, org: string, site: string, image: SharedTypes.MediaData): Promise<string>;

  /**
   * Save image location for a site.
   * 
   * @param {Context} ctx
   * @param {string} org
   * @param {string} site
   * @param {string} url
   * @param {string} location eg. "./media_hash.jpg"
   */
  saveImageLocation(ctx: Context, org: string, site: string, url: string, location: string): Promise<void>;

  /**
   * Lookup image location for a previously processed image.
   * Returns either the image filename or null if the image has not been processed yet.
   * 
   * @param {Context} ctx
   * @param {string} org
   * @param {string} site
   * @param {string} url
   * @returns {Promise<string>} location, eg. "./media_hash.jpg"
   */
  lookupImageLocation(ctx: Context, org: string, site: string, url: string): Promise<string | null>;

  /**
   * Load stored index for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @returns {Promise<SharedTypes.StoredIndex>}
   */
  fetchQueryIndex(catalogKey: string): Promise<SharedTypes.StoredIndex | null>;

  /**
   * Save index for a site.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @param {SharedTypes.StoredIndex} data
   */
  saveQueryIndex(catalogKey: string, data: SharedTypes.StoredIndex): Promise<void>;

  /**
   * Load stored feed for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @returns {Promise<SharedTypes.StoredFeed>}
   */
  fetchFeed(catalogKey: string): Promise<SharedTypes.StoredFeed | null>;

  /**
   * Save feed for a site.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @param {SharedTypes.StoredFeed} data
   */
  saveFeed(catalogKey: string, data: SharedTypes.StoredFeed): Promise<void>;

  /**
   * Load stored index for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @returns {Promise<SharedTypes.StoredIndex>}
   */
  fetchQueryIndexByPath(org: string, site: string, rootPath: string): Promise<SharedTypes.StoredIndex | null>;

  /**
   * Save index for a site.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @param {SharedTypes.StoredIndex} data
   */
  saveQueryIndexByPath(org: string, site: string, rootPath: string, data: SharedTypes.StoredIndex): Promise<void>;

  /**
   * Check if index exists for a site/rootPath.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @returns {Promise<boolean>}
   */
  queryIndexExists(org: string, site: string, rootPath: string): Promise<boolean>;

  /**
   * Delete index for a site/rootPath.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   */
  deleteQueryIndex(org: string, site: string, rootPath: string): Promise<void>;

  /**
   * Load stored feed for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @returns {Promise<SharedTypes.StoredFeed>}
   */
  fetchFeedByPath(org: string, site: string, rootPath: string): Promise<SharedTypes.StoredFeed | null>;

  /**
   * Save feed for a site.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @param {SharedTypes.StoredFeed} data
   */
  saveFeedByPath(org: string, site: string, rootPath: string, data: SharedTypes.StoredFeed): Promise<void>;

  /**
   * Check if feed exists for a site/rootPath.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @returns {Promise<boolean>}
   */
  feedExists(org: string, site: string, rootPath: string): Promise<boolean>;

  /**
   * Delete feed for a site/rootPath.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   */
  deleteFeed(org: string, site: string, rootPath: string): Promise<void>;

  /**
   * Save product for a site.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @param {string} sku
   * @returns {Promise<SharedTypes.ProductBusEntry | null>}
   */
  fetchProduct(catalogKey: string, sku: string): Promise<SharedTypes.ProductBusEntry | null>;

  /**
   * Fetch product by path for a site.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} path
   * @returns {Promise<SharedTypes.ProductBusEntry | null>}
   */
  fetchProductByPath(org: string, site: string, path: string): Promise<SharedTypes.ProductBusEntry | null>;

  /**
   * Save product for a site.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @param {string} sku
   * @param {SharedTypes.ProductBusEntry} product
   */
  saveProduct(catalogKey: string, sku: string, product: SharedTypes.ProductBusEntry): Promise<void>;

  /**
   * Save product by path for a site.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} path
   * @param {SharedTypes.ProductBusEntry} product
   */
  saveProductByPath(org: string, site: string, path: string, product: SharedTypes.ProductBusEntry): Promise<void>;

  /**
   * Fetch registry.
   *
   * @returns {Promise<SharedTypes.StoredRegistry>}
   */
  fetchRegistry(): Promise<SharedTypes.StoredRegistry>;

  /**
   * Save registry.
   *
   * @param {SharedTypes.StoredRegistry} registry
   */
  saveRegistry(registry: SharedTypes.StoredRegistry): Promise<void>;

  /**
   * Fetch the index registry for a site.
   * Returns an object mapping index paths to their metadata.
   *
   * @param {string} org
   * @param {string} site
   * @returns {Promise<{data: Record<string, {lastmod: string}>, etag: string | null}>}
   */
  fetchIndexRegistry(org: string, site: string): Promise<{ data: Record<string, { lastmod: string }>, etag: string | null }>;

  /**
   * Save the index registry for a site.
   * Uses conditional write with etag to prevent concurrent modification issues.
   *
   * @param {string} org
   * @param {string} site
   * @param {Record<string, {lastmod: string}>} registry
   * @param {string | null} [etag] - Optional etag for conditional write
   * @returns {Promise<void>}
   * @throws {Error} if etag mismatch (precondition failed)
   */
  saveIndexRegistry(org: string, site: string, registry: Record<string, { lastmod: string }>, etag?: string | null): Promise<void>;
}