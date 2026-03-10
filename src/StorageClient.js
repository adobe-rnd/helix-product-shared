/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * @typedef {import("@cloudflare/workers-types").R2Bucket} R2Bucket
 * @typedef {import("./types/index").ProductBusEntry} ProductBusEntry
 * @typedef {import("./types/context").Context} Context
 */

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {Context} ctx
 * @returns {StorageClient}
 */
export class StorageClient {
  /**
   * @param {Context} ctx
   * @returns {StorageClient}
   */
  static fromContext(ctx) {
    if (!ctx.attributes.storageClient) {
      ctx.attributes.storageClient = new StorageClient(ctx);
    }
    return ctx.attributes.storageClient;
  }

  /** @type {Context} */
  ctx = undefined;

  /** @type {R2Bucket} */
  bucket = undefined;

  /**
   * @param {Context} ctx
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.bucket = ctx.env.CATALOG_BUCKET;
  }

  /**
   * @param {R2Bucket} bucket
   * @param {Parameters<R2Bucket['put']>[0]} key
   * @param {Parameters<R2Bucket['put']>[1]} data
   * @param {Parameters<R2Bucket['put']>[2]} options
   * @param {number} retryCount
   */
  async #put(bucket, key, data, options, retryCount = 0) {
    const { log } = this.ctx;
    try {
      await bucket.put(key, data, options);
    } catch (e) {
      // conditionally retry
      log.error('Error putting to R2:', e, e.code);
      if (retryCount < 3 && e.message.includes('try again')) {
        await sleep(1000 * retryCount);
        await this.#put(bucket, key, data, options, retryCount + 1);
      }
      throw e;
    }
  }

  /**
   * @param {Parameters<R2Bucket['put']>[0]} key
   * @param {Parameters<R2Bucket['put']>[1]} data
   * @param {Parameters<R2Bucket['put']>[2]} [options]
   */
  async put(key, data, options) {
    return this.#put(this.bucket, key, data, options);
  }

  /**
   * @param {R2Bucket} bucket
   * @param {Parameters<R2Bucket['put']>[0]} key
   * @param {Parameters<R2Bucket['put']>[1]} data
   * @param {Parameters<R2Bucket['put']>[2]} [options]
   */
  async putTo(bucket, key, data, options) {
    return this.#put(bucket, key, data, options);
  }

  /**
   * @param {string} catalogKey
   * @param {string} sku
   * @returns {Promise<ProductBusEntry|null>}
   */
  async fetchProduct(catalogKey, sku) {
    const { log } = this.ctx;

    const key = `${catalogKey}/products/${sku}.json`;
    log.debug('Fetching product from R2:', key);
    const object = await this.bucket.get(key);
    if (!object) {
      return null;
    }
    return object.json();
  }

  /**
   * @param {string} org
   * @param {string} site
   * @param {string} path
   * @param {boolean} [includeInternal=false] - Include internal data in response
   * @returns {Promise<ProductBusEntry|null|{
   *   product: ProductBusEntry,
   *   metadata: Record<string, string>
   * }>}
   */
  async fetchProductByPath(org, site, path, includeInternal = false) {
    const { log } = this.ctx;

    const key = `${org}/${site}/catalog${path}${path.endsWith('.json') ? '' : '.json'}`;
    log.debug('Fetching product from R2:', key);
    const object = await this.bucket.get(key);
    if (!object) {
      return null;
    }
    const product = await object.json();

    // By default, remove internal property before returning
    if (!includeInternal && product.internal) {
      delete product.internal;
    }

    return product;
  }

  /**
   * @param {string} catalogKey
   * @param {string} sku
   * @param {ProductBusEntry} product
   */
  async saveProduct(catalogKey, sku, product) {
    const { log } = this.ctx;
    const key = `${catalogKey}/products/${sku}.json`;
    log.debug('Saving product to R2:', key);
    await this.put(key, JSON.stringify(product), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  /**
   * @param {string} org
   * @param {string} site
   * @param {string} path
   * @param {ProductBusEntry} product
   * @param {Record<string, string>} [customMetadata] - Optional custom metadata to store
   */
  async saveProductByPath(org, site, path, product, customMetadata) {
    const { log } = this.ctx;
    const key = `${org}/${site}/catalog${path}${path.endsWith('.json') ? '' : '.json'}`;
    log.debug('Saving product to R2:', key);
    await this.put(key, JSON.stringify(product), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata,
    });
  }

  /**
   * @param {Context} ctx
   * @param {string} org
   * @param {string} site
   * @param {string} url
   * @param {string} location // eg. "./media_hash.jpg"
   */
  async saveImageLocation(ctx, org, site, url, location) {
    const { log } = ctx;
    const key = `${org}/${site}/media/.lookup/${encodeURIComponent(url)}`;
    log.debug('Saving image location to R2:', key);
    await this.put(key, '', { customMetadata: { location } });
  }

  /**
   * @param {Context} ctx
   * @param {string} org
   * @param {string} site
   * @param {string} url
   * @returns {Promise<string|null>} // eg. "./media_hash.jpg"
   */
  async lookupImageLocation(ctx, org, site, url) {
    const { log } = ctx;
    const key = `${org}/${site}/media/.lookup/${encodeURIComponent(url)}`;
    log.debug('Fetching image location from R2:', key);
    const object = await this.bucket.head(key);
    if (!object) {
      return null;
    }
    return object.customMetadata?.location;
  }

  /**
   * @param {Context} ctx
   * @param {string} org
   * @param {string} site
   * @param {import("./types/media").MediaData} image
   * @returns {Promise<string>} new filename
   */
  async saveImage(ctx, org, site, image) {
    const {
      env,
      log,
    } = ctx;
    const {
      data,
      hash,
      mimeType,
      extension,
      sourceUrl,
    } = image;

    const filename = `media_${hash}${extension ? `.${extension}` : ''}`;
    const key = `${org}/${site}/media/${filename}`;
    const resp = await env.CATALOG_BUCKET.head(key);
    if (resp) {
      log.debug(`image already in storage: ${sourceUrl} (${hash})`);
      return `./${filename}`;
    }

    await this.put(key, data, {
      httpMetadata: {
        contentType: mimeType,
      },
      customMetadata: {
        sourceLocation: sourceUrl,
      },
    });
    await this.saveImageLocation(ctx, org, site, sourceUrl, `./${filename}`);
    return `./${filename}`;
  }

  /**
   * Load stored index for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @returns {Promise<SharedTypes.StoredIndex>}
   */
  async fetchQueryIndex(catalogKey) {
    const { log } = this.ctx;

    const key = `${catalogKey}/index/default.json`;
    log.debug('Fetching index from R2:', key);

    const object = await this.bucket.get(key);
    if (!object) {
      return {};
    }

    const index = await object.json();
    return index;
  }

  /**
   * @param {string} catalogKey
   * @param {SharedTypes.StoredIndex} data
   */
  async saveQueryIndex(catalogKey, data) {
    const { log } = this.ctx;

    const key = `${catalogKey}/index/default.json`;
    log.debug('Saving index to R2:', key);
    await this.put(key, JSON.stringify(data));
  }

  /**
   * Load stored feed for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @returns {Promise<SharedTypes.StoredFeed>}
   */
  async fetchFeed(catalogKey) {
    const { log } = this.ctx;

    const key = `${catalogKey}/feed/default.json`;
    log.debug('Fetching feed from R2:', key);

    const object = await this.bucket.get(key);
    if (!object) {
      return {};
    }

    const index = await object.json();
    return index;
  }

  /**
   * @param {string} catalogKey
   * @param {SharedTypes.StoredFeed} data
   */
  async saveFeed(catalogKey, data) {
    const { log } = this.ctx;

    const key = `${catalogKey}/feed/default.json`;
    log.debug('Saving feed to R2:', key);
    await this.put(key, JSON.stringify(data));
  }

  /**
   * Load stored index for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @returns {Promise<SharedTypes.StoredIndex>}
   */
  async fetchQueryIndexByPath(org, site, rootPath) {
    const { log } = this.ctx;

    const key = `${org}/${site}/indices${rootPath}/index.json`;
    log.debug('Fetching index from R2:', key);

    const object = await this.bucket.get(key);
    if (!object) {
      return {};
    }

    const index = await object.json();
    return index;
  }

  /**
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @param {SharedTypes.StoredIndex} data
   */
  async saveQueryIndexByPath(org, site, rootPath, data) {
    const { log } = this.ctx;

    const key = `${org}/${site}/indices${rootPath}/index.json`;
    log.debug('Saving index to R2:', key);
    await this.put(key, JSON.stringify(data));
  }

  /**
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @returns {Promise<boolean>}
   */
  async queryIndexExists(org, site, rootPath) {
    const key = `${org}/${site}/indices${rootPath}/index.json`;
    const object = await this.bucket.head(key);
    return !!object;
  }

  /**
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   */
  async deleteQueryIndex(org, site, rootPath) {
    const key = `${org}/${site}/indices${rootPath}/index.json`;
    this.ctx.log.debug('Deleting index from R2:', key);
    return this.bucket.delete(key);
  }

  /**
   * Load stored feed for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @returns {Promise<SharedTypes.StoredFeed>}
   */
  async fetchFeedByPath(org, site, rootPath) {
    const { log } = this.ctx;

    const key = `${org}/${site}/indices${rootPath}/feed.json`;
    log.debug('Fetching feed from R2:', key);

    const object = await this.bucket.get(key);
    if (!object) {
      return {};
    }

    const index = await object.json();
    return index;
  }

  /**
   * @param {string} catalogKey
   * @param {SharedTypes.StoredFeed} data
   */
  async saveFeedByPath(org, site, rootPath, data) {
    const { log } = this.ctx;

    const key = `${org}/${site}/indices${rootPath}/feed.json`;
    log.debug('Saving feed to R2:', key);
    await this.put(key, JSON.stringify(data));
  }

  /**
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   * @returns {Promise<boolean>}
   */
  async feedExists(org, site, rootPath) {
    const key = `${org}/${site}/indices${rootPath}/feed.json`;
    const object = await this.bucket.head(key);
    return !!object;
  }

  /**
   * @param {string} org
   * @param {string} site
   * @param {string} rootPath
   */
  async deleteFeed(org, site, rootPath) {
    const key = `${org}/${site}/indices${rootPath}/feed.json`;
    this.ctx.log.debug('Deleting feed from R2:', key);
    return this.bucket.delete(key);
  }

  /**
   * @returns {Promise<SharedTypes.StoredRegistry>}
   */
  async fetchRegistry() {
    const { log } = this.ctx;

    const key = '.merchant-feed-registry.json';
    log.debug('Fetching registry from R2:', key);

    const object = await this.bucket.get(key);
    if (!object) {
      return {};
    }

    const registry = await object.json();
    return registry;
  }

  /**
   * @param {SharedTypes.StoredRegistry} registry
   */
  async saveRegistry(registry) {
    const { log } = this.ctx;

    const key = '.merchant-feed-registry.json';
    log.debug('Saving registry to R2:', key);
    await this.put(key, JSON.stringify(registry));
  }

  /**
   * Fetch the index registry for a site.
   * Returns an object mapping index paths to their metadata.
   *
   * @param {string} org
   * @param {string} site
   * @returns {Promise<{data: Record<string, {lastmod: string}>, etag: string | null}>}
   */
  async fetchIndexRegistry(org, site) {
    const { log } = this.ctx;

    const key = `${org}/${site}/indices/.registry.json`;
    log.debug('Fetching index registry from R2:', key);

    const object = await this.bucket.get(key);
    if (!object) {
      return { data: {}, etag: null };
    }

    const registry = await object.json();
    return { data: registry, etag: object.etag };
  }

  /**
   * Save the index registry for a site.
   *
   * @throws {Error} if etag mismatch (precondition failed)
   *
   * @param {string} org
   * @param {string} site
   * @param {Record<string, {lastmod: string}>} registry
   * @param {string | null} [etag] - Optional etag for conditional write
   * @returns {Promise<void>}
   */
  async saveIndexRegistry(org, site, registry, etag) {
    const { log } = this.ctx;

    const key = `${org}/${site}/indices/.registry.json`;
    log.debug('Saving index registry to R2:', key);

    const options = {
      httpMetadata: { contentType: 'application/json' },
    };

    // conditional write if etag is provided
    if (etag !== undefined && etag !== null) {
      options.onlyIf = { etagMatches: etag };
    }

    try {
      await this.put(key, JSON.stringify(registry), options);
    } catch (e) {
      // R2 throws an error if the precondition fails
      if (e.message && e.message.includes('precondition')) {
        const error = new Error('Precondition failed: etag mismatch');
        error.code = 'PRECONDITION_FAILED';
        throw error;
      }
      throw e;
    }
  }
}
