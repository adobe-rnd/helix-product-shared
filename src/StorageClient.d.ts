import { R2Bucket } from "@cloudflare/workers-types";
import * as SharedTypes from './types';

export interface Context {
  env: Record<string, any>;
  log: Console;

  attributes: {
    storageClient?: StorageClient;
    [key: string]: any;
  };
}

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
   * @param {SharedTypes.MediaData} image
   * @returns {Promise<string>} new filename
   */
  saveImage(ctx: Context, org: string, site: string, image: SharedTypes.MediaData): Promise<string>;

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
   * Load stored merchant feed for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @returns {Promise<SharedTypes.StoredMerchantFeed>}
   */
  fetchMerchantFeed(catalogKey: string): Promise<SharedTypes.StoredMerchantFeed | null>;

  /**
   * Save merchant feed for a site.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @param {SharedTypes.StoredMerchantFeed} data
   */
  saveMerchantFeed(catalogKey: string, data: SharedTypes.StoredMerchantFeed): Promise<void>;

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
   * Load stored merchant feed for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @returns {Promise<SharedTypes.StoredMerchantFeed>}
   */
  fetchMerchantFeedByPath(org: string, site: string, rootPath: string): Promise<SharedTypes.StoredMerchantFeed | null>;

  /**
   * Save merchant feed for a site.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @param {SharedTypes.StoredMerchantFeed} data
   */
  saveMerchantFeedByPath(org: string, site: string, rootPath: string, data: SharedTypes.StoredMerchantFeed): Promise<void>;

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
}