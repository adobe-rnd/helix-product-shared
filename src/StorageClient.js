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
 */

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class StorageClient {
  /**
   * @param {import("./StorageClient").Context} ctx
   * @returns {StorageClient}
   */
  static fromContext(ctx) {
    if (!ctx.attributes.storageClient) {
      ctx.attributes.storageClient = new StorageClient(ctx);
    }
    return ctx.attributes.storageClient;
  }

  /** @type {import("./StorageClient").Context} */
  ctx = undefined;

  /** @type {R2Bucket} */
  bucket = undefined;

  /**
   * @param {import("./StorageClient").Context} ctx
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
   * @returns {Promise<SharedTypes.ProductBusEntry|null>}
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
   * @param {string} catalogKey
   * @param {string} sku
   * @param {SharedTypes.ProductBusEntry} product
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
   * @param {Context} ctx
   * @param {string} org
   * @param {string} site
   * @param {SharedTypes.MediaData} image
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
   * Load stored merchant feed for a site.
   * If it doesn't exist, return empty object.
   *
   * @param {string} catalogKey `org/site/storeCode/storeViewCode`
   * @returns {Promise<SharedTypes.StoredMerchantFeed>}
   */
  async fetchMerchantFeed(catalogKey) {
    const { log } = this.ctx;

    const key = `${catalogKey}/merchant-feed/default.json`;
    log.debug('Fetching merchant feed from R2:', key);

    const object = await this.bucket.get(key);
    if (!object) {
      return {};
    }

    const index = await object.json();
    return index;
  }

  /**
   * @param {string} catalogKey
   * @param {SharedTypes.StoredMerchantFeed} data
   */
  async saveMerchantFeed(catalogKey, data) {
    const { log } = this.ctx;

    const key = `${catalogKey}/merchant-feed/default.json`;
    log.debug('Saving merchant feed to R2:', key);
    await this.put(key, JSON.stringify(data));
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
}
