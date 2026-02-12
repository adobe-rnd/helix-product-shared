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

import assert from 'node:assert';
import { StorageClient } from '../src/StorageClient.js';
import { TEST_CONTEXT } from './util.js';

/**
 * Create a mock R2 bucket object
 */
function createMockBucket() {
  const storage = new Map();
  const metadata = new Map();
  const etags = new Map();
  let etagCounter = 0;

  return {
    storage,
    metadata,
    put: async (key, data, options) => {
      storage.set(key, { data, options });
      if (options?.customMetadata) {
        metadata.set(key, options.customMetadata);
      }
      // Generate a new etag for this put
      etagCounter += 1;
      etags.set(key, `etag-${etagCounter}`);
    },
    get: async (key) => {
      const item = storage.get(key);
      if (!item) return null;
      return {
        json: async () => JSON.parse(item.data),
        text: async () => item.data,
        customMetadata: metadata.get(key),
        etag: etags.get(key),
      };
    },
    head: async (key) => {
      const item = storage.get(key);
      if (!item) return null;
      return {
        customMetadata: metadata.get(key),
        etag: etags.get(key),
      };
    },
    delete: async (key) => {
      storage.delete(key);
      metadata.delete(key);
      etags.delete(key);
    },
  };
}

/**
 * Create a mock context
 */
const CONTEXT = () => {
  const bucket = createMockBucket();
  return TEST_CONTEXT({
    env: {
      CATALOG_BUCKET: bucket,
    },
    log: {
      debug: () => {},
      error: () => {},
    },
    attributes: {},
  });
};

describe('StorageClient', () => {
  describe('fromContext', () => {
    it('creates and caches a StorageClient from context', () => {
      const ctx = CONTEXT();
      const client1 = StorageClient.fromContext(ctx);
      const client2 = StorageClient.fromContext(ctx);

      assert.ok(client1 instanceof StorageClient);
      assert.strictEqual(client1, client2, 'Should return cached instance');
      assert.strictEqual(ctx.attributes.storageClient, client1);
    });

    it('creates different instances for different contexts', () => {
      const ctx1 = CONTEXT();
      const ctx2 = CONTEXT();
      const client1 = StorageClient.fromContext(ctx1);
      const client2 = StorageClient.fromContext(ctx2);

      assert.notStrictEqual(client1, client2);
    });
  });

  describe('constructor', () => {
    it('initializes with context and bucket', () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);

      assert.strictEqual(client.ctx, ctx);
      assert.strictEqual(client.bucket, ctx.env.CATALOG_BUCKET);
    });
  });

  describe('put and putTo', () => {
    it('puts data to the bucket', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);

      await client.put('test/key.json', JSON.stringify({ test: 'data' }), {
        httpMetadata: { contentType: 'application/json' },
      });

      const result = await ctx.env.CATALOG_BUCKET.get('test/key.json');
      assert.ok(result);
      const data = await result.json();
      assert.deepStrictEqual(data, { test: 'data' });
    });

    it('putTo writes to specified bucket', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const otherBucket = createMockBucket();

      await client.putTo(otherBucket, 'test/key.json', JSON.stringify({ test: 'data' }));

      const result = await otherBucket.get('test/key.json');
      assert.ok(result);
      const data = await result.json();
      assert.deepStrictEqual(data, { test: 'data' });
    });

    it('throws after max retries', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      let attempts = 0;

      // Mock bucket that always fails
      const failingBucket = {
        put: async () => {
          attempts += 1;
          const error = new Error('please try again');
          throw error;
        },
      };

      await assert.rejects(
        async () => client.putTo(failingBucket, 'test/key.json', 'data'),
        /please try again/,
      );
      // Should have tried 4 times total (initial + 3 retries)
      assert.strictEqual(attempts, 4);
    }).timeout(10000);

    it('does not retry on non-retryable errors', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      let attempts = 0;

      const failingBucket = {
        put: async () => {
          attempts += 1;
          throw new Error('permanent error');
        },
      };

      await assert.rejects(
        async () => client.putTo(failingBucket, 'test/key.json', 'data'),
        /permanent error/,
      );
      assert.strictEqual(attempts, 1);
    });
  });

  describe('fetchProduct', () => {
    it('fetches a product by catalogKey and sku', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const product = { sku: 'ABC123', name: 'Test Product' };

      await ctx.env.CATALOG_BUCKET.put(
        'org/site/store/view/products/ABC123.json',
        JSON.stringify(product),
      );

      const result = await client.fetchProduct('org/site/store/view', 'ABC123');
      assert.deepStrictEqual(result, product);
    });

    it('returns null when product does not exist', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);

      const result = await client.fetchProduct('org/site/store/view', 'NONEXISTENT');
      assert.strictEqual(result, null);
    });
  });

  describe('fetchProductByPath', () => {
    it('fetches a product by path', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const product = { sku: 'ABC123', name: 'Test Product' };

      await ctx.env.CATALOG_BUCKET.put(
        'org/site/catalog/products/test-product.json',
        JSON.stringify(product),
      );

      const result = await client.fetchProductByPath('org', 'site', '/products/test-product');
      assert.deepStrictEqual(result, product);
    });

    it('handles paths with .json extension', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const product = { sku: 'ABC123', name: 'Test Product' };

      await ctx.env.CATALOG_BUCKET.put(
        'org/site/catalog/products/test-product.json',
        JSON.stringify(product),
      );

      const result = await client.fetchProductByPath('org', 'site', '/products/test-product.json');
      assert.deepStrictEqual(result, product);
    });

    it('returns null when product does not exist', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);

      const result = await client.fetchProductByPath('org', 'site', '/products/nonexistent');
      assert.strictEqual(result, null);
    });

    it('removes internal property by default', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const product = {
        sku: 'ABC123',
        name: 'Test Product',
        internal: {
          images: {
            'https://example.com/image.jpg': {
              sourceUrl: './media_hash123.jpg',
              size: 1000,
              mimeType: 'image/jpeg',
            },
          },
        },
      };

      await ctx.env.CATALOG_BUCKET.put(
        'org/site/catalog/products/test-product.json',
        JSON.stringify(product),
      );

      const result = await client.fetchProductByPath('org', 'site', '/products/test-product');
      assert.strictEqual(result.sku, 'ABC123');
      assert.strictEqual(result.name, 'Test Product');
      assert.strictEqual(result.internal, undefined);
    });

    it('includes internal property when includeInternal=true', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const product = {
        sku: 'ABC123',
        name: 'Test Product',
        internal: {
          images: {
            'https://example.com/image.jpg': {
              sourceUrl: './media_hash123.jpg',
              size: 1000,
              mimeType: 'image/jpeg',
            },
          },
        },
      };

      await ctx.env.CATALOG_BUCKET.put(
        'org/site/catalog/products/test-product.json',
        JSON.stringify(product),
      );

      const result = await client.fetchProductByPath('org', 'site', '/products/test-product', true);
      assert.strictEqual(result.sku, 'ABC123');
      assert.strictEqual(result.name, 'Test Product');
      assert.ok(result.internal);
      assert.ok(result.internal.images);
      assert.strictEqual(result.internal.images['https://example.com/image.jpg'].sourceUrl, './media_hash123.jpg');
      assert.strictEqual(result.internal.images['https://example.com/image.jpg'].size, 1000);
      assert.strictEqual(result.internal.images['https://example.com/image.jpg'].mimeType, 'image/jpeg');
    });

    it('removes internal property when includeInternal=false', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const product = {
        sku: 'ABC123',
        name: 'Test Product',
        internal: {
          images: {
            'https://example.com/image.jpg': {
              sourceUrl: './media_hash123.jpg',
              size: 1000,
              mimeType: 'image/jpeg',
            },
          },
        },
      };

      await ctx.env.CATALOG_BUCKET.put(
        'org/site/catalog/products/test-product.json',
        JSON.stringify(product),
      );

      const result = await client.fetchProductByPath('org', 'site', '/products/test-product', false);
      assert.strictEqual(result.sku, 'ABC123');
      assert.strictEqual(result.name, 'Test Product');
      assert.strictEqual(result.internal, undefined);
    });

    it('handles products without internal property', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const product = {
        sku: 'ABC123',
        name: 'Test Product',
      };

      await ctx.env.CATALOG_BUCKET.put(
        'org/site/catalog/products/test-product.json',
        JSON.stringify(product),
      );

      // Should work fine whether includeInternal is true or false
      const resultDefault = await client.fetchProductByPath('org', 'site', '/products/test-product');
      assert.strictEqual(resultDefault.sku, 'ABC123');
      assert.strictEqual(resultDefault.internal, undefined);

      const resultTrue = await client.fetchProductByPath('org', 'site', '/products/test-product', true);
      assert.strictEqual(resultTrue.sku, 'ABC123');
      assert.strictEqual(resultTrue.internal, undefined);

      const resultFalse = await client.fetchProductByPath('org', 'site', '/products/test-product', false);
      assert.strictEqual(resultFalse.sku, 'ABC123');
      assert.strictEqual(resultFalse.internal, undefined);
    });
  });

  describe('saveProduct', () => {
    it('saves a product by catalogKey and sku', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const product = { sku: 'ABC123', name: 'Test Product' };

      await client.saveProduct('org/site/store/view', 'ABC123', product);

      const result = await ctx.env.CATALOG_BUCKET.get('org/site/store/view/products/ABC123.json');
      assert.ok(result);
      const data = await result.json();
      assert.deepStrictEqual(data, product);
    });
  });

  describe('saveProductByPath', () => {
    it('saves a product by path', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const product = { sku: 'ABC123', name: 'Test Product' };

      await client.saveProductByPath('org', 'site', '/products/test-product', product);

      const result = await ctx.env.CATALOG_BUCKET.get('org/site/catalog/products/test-product.json');
      assert.ok(result);
      const data = await result.json();
      assert.deepStrictEqual(data, product);
    });

    it('handles paths with .json extension', async () => {
      const ctx = CONTEXT();
      const client = new StorageClient(ctx);
      const product = { sku: 'ABC123', name: 'Test Product' };

      await client.saveProductByPath('org', 'site', '/products/test-product.json', product);

      const result = await ctx.env.CATALOG_BUCKET.get('org/site/catalog/products/test-product.json');
      assert.ok(result);
      const data = await result.json();
      assert.deepStrictEqual(data, product);
    });
  });

  describe('Image operations', () => {
    describe('saveImageLocation', () => {
      it('saves image location with metadata', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        await client.saveImageLocation(ctx, 'org', 'site', 'https://example.com/image.jpg', './media_abc123.jpg');

        const key = `org/site/media/.lookup/${encodeURIComponent('https://example.com/image.jpg')}`;
        const result = await ctx.env.CATALOG_BUCKET.head(key);
        assert.ok(result);
        assert.strictEqual(result.customMetadata.location, './media_abc123.jpg');
      });
    });

    describe('lookupImageLocation', () => {
      it('retrieves image location from metadata', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        await client.saveImageLocation(ctx, 'org', 'site', 'https://example.com/image.jpg', './media_abc123.jpg');
        const location = await client.lookupImageLocation(ctx, 'org', 'site', 'https://example.com/image.jpg');

        assert.strictEqual(location, './media_abc123.jpg');
      });

      it('returns null when location does not exist', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        const location = await client.lookupImageLocation(ctx, 'org', 'site', 'https://example.com/nonexistent.jpg');
        assert.strictEqual(location, null);
      });
    });

    describe('saveImage', () => {
      it('saves image data and creates lookup entry', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const imageData = {
          data: Buffer.from('fake image data'),
          hash: 'abc123',
          mimeType: 'image/jpeg',
          extension: 'jpg',
          sourceUrl: 'https://example.com/image.jpg',
        };

        const filename = await client.saveImage(ctx, 'org', 'site', imageData);

        assert.strictEqual(filename, './media_abc123.jpg');

        // Verify image was saved
        const imageKey = 'org/site/media/media_abc123.jpg';
        const imageResult = await ctx.env.CATALOG_BUCKET.get(imageKey);
        assert.ok(imageResult);

        // Verify lookup was saved
        const location = await client.lookupImageLocation(ctx, 'org', 'site', 'https://example.com/image.jpg');
        assert.strictEqual(location, './media_abc123.jpg');
      });

      it('skips saving if image already exists', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const imageData = {
          data: Buffer.from('fake image data'),
          hash: 'abc123',
          mimeType: 'image/jpeg',
          extension: 'jpg',
          sourceUrl: 'https://example.com/image.jpg',
        };

        // Save once
        await client.saveImage(ctx, 'org', 'site', imageData);

        // Save again with different data
        const imageData2 = {
          ...imageData,
          data: Buffer.from('different data'),
        };
        const filename = await client.saveImage(ctx, 'org', 'site', imageData2);

        assert.strictEqual(filename, './media_abc123.jpg');
      });

      it('handles images without extension', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const imageData = {
          data: Buffer.from('fake image data'),
          hash: 'abc123',
          mimeType: 'image/jpeg',
          extension: '',
          sourceUrl: 'https://example.com/image',
        };

        const filename = await client.saveImage(ctx, 'org', 'site', imageData);
        assert.strictEqual(filename, './media_abc123');
      });
    });
  });

  describe('Query Index operations', () => {
    describe('fetchQueryIndex', () => {
      it('fetches query index', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const index = { products: ['ABC123', 'DEF456'] };

        await ctx.env.CATALOG_BUCKET.put(
          'org/site/store/view/index/default.json',
          JSON.stringify(index),
        );

        const result = await client.fetchQueryIndex('org/site/store/view');
        assert.deepStrictEqual(result, index);
      });

      it('returns empty object when index does not exist', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        const result = await client.fetchQueryIndex('org/site/store/view');
        assert.deepStrictEqual(result, {});
      });
    });

    describe('saveQueryIndex', () => {
      it('saves query index', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const index = { products: ['ABC123', 'DEF456'] };

        await client.saveQueryIndex('org/site/store/view', index);

        const result = await ctx.env.CATALOG_BUCKET.get('org/site/store/view/index/default.json');
        assert.ok(result);
        const data = await result.json();
        assert.deepStrictEqual(data, index);
      });
    });

    describe('fetchQueryIndexByPath', () => {
      it('fetches query index by path', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const index = { products: ['ABC123', 'DEF456'] };

        await ctx.env.CATALOG_BUCKET.put(
          'org/site/indices/products/index.json',
          JSON.stringify(index),
        );

        const result = await client.fetchQueryIndexByPath('org', 'site', '/products');
        assert.deepStrictEqual(result, index);
      });

      it('returns empty object when index does not exist', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        const result = await client.fetchQueryIndexByPath('org', 'site', '/products');
        assert.deepStrictEqual(result, {});
      });
    });

    describe('saveQueryIndexByPath', () => {
      it('saves query index by path', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const index = { products: ['ABC123', 'DEF456'] };

        await client.saveQueryIndexByPath('org', 'site', '/products', index);

        const result = await ctx.env.CATALOG_BUCKET.get('org/site/indices/products/index.json');
        assert.ok(result);
        const data = await result.json();
        assert.deepStrictEqual(data, index);
      });
    });

    describe('queryIndexExists', () => {
      it('returns true when index exists', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const index = { products: ['ABC123'] };

        await ctx.env.CATALOG_BUCKET.put(
          'org/site/indices/products/index.json',
          JSON.stringify(index),
        );

        const exists = await client.queryIndexExists('org', 'site', '/products');
        assert.strictEqual(exists, true);
      });

      it('returns false when index does not exist', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        const exists = await client.queryIndexExists('org', 'site', '/products');
        assert.strictEqual(exists, false);
      });
    });

    describe('deleteQueryIndex', () => {
      it('deletes query index', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const index = { products: ['ABC123'] };

        await ctx.env.CATALOG_BUCKET.put(
          'org/site/indices/products/index.json',
          JSON.stringify(index),
        );

        await client.deleteQueryIndex('org', 'site', '/products');

        const result = await ctx.env.CATALOG_BUCKET.get('org/site/indices/products/index.json');
        assert.strictEqual(result, null);
      });
    });
  });

  describe('Feed operations', () => {
    describe('fetchFeed', () => {
      it('fetches feed', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const feed = { items: [{ id: '1', price: 100 }] };

        await ctx.env.CATALOG_BUCKET.put(
          'org/site/store/view/feed/default.json',
          JSON.stringify(feed),
        );

        const result = await client.fetchFeed('org/site/store/view');
        assert.deepStrictEqual(result, feed);
      });

      it('returns empty object when feed does not exist', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        const result = await client.fetchFeed('org/site/store/view');
        assert.deepStrictEqual(result, {});
      });
    });

    describe('saveFeed', () => {
      it('saves feed', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const feed = { items: [{ id: '1', price: 100 }] };

        await client.saveFeed('org/site/store/view', feed);

        const result = await ctx.env.CATALOG_BUCKET.get('org/site/store/view/feed/default.json');
        assert.ok(result);
        const data = await result.json();
        assert.deepStrictEqual(data, feed);
      });
    });

    describe('fetchFeedByPath', () => {
      it('fetches feed by path', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const feed = { items: [{ id: '1', price: 100 }] };

        await ctx.env.CATALOG_BUCKET.put(
          'org/site/indices/products/feed.json',
          JSON.stringify(feed),
        );

        const result = await client.fetchFeedByPath('org', 'site', '/products');
        assert.deepStrictEqual(result, feed);
      });

      it('returns empty object when feed does not exist', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        const result = await client.fetchFeedByPath('org', 'site', '/products');
        assert.deepStrictEqual(result, {});
      });
    });

    describe('saveFeedByPath', () => {
      it('saves feed by path', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const feed = { items: [{ id: '1', price: 100 }] };

        await client.saveFeedByPath('org', 'site', '/products', feed);

        const result = await ctx.env.CATALOG_BUCKET.get('org/site/indices/products/feed.json');
        assert.ok(result);
        const data = await result.json();
        assert.deepStrictEqual(data, feed);
      });
    });

    describe('feedExists', () => {
      it('returns true when feed exists', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const feed = { items: [] };

        await ctx.env.CATALOG_BUCKET.put(
          'org/site/indices/products/feed.json',
          JSON.stringify(feed),
        );

        const exists = await client.feedExists('org', 'site', '/products');
        assert.strictEqual(exists, true);
      });

      it('returns false when feed does not exist', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        const exists = await client.feedExists('org', 'site', '/products');
        assert.strictEqual(exists, false);
      });
    });

    describe('deleteFeed', () => {
      it('deletes feed', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const feed = { items: [] };

        await ctx.env.CATALOG_BUCKET.put(
          'org/site/indices/products/feed.json',
          JSON.stringify(feed),
        );

        await client.deleteFeed('org', 'site', '/products');

        const result = await ctx.env.CATALOG_BUCKET.get('org/site/indices/products/feed.json');
        assert.strictEqual(result, null);
      });
    });
  });

  describe('Registry operations', () => {
    describe('fetchRegistry', () => {
      it('fetches registry', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const registry = { 'org/site/products': { lastUpdated: '2025-01-01' } };

        await ctx.env.CATALOG_BUCKET.put(
          '.merchant-feed-registry.json',
          JSON.stringify(registry),
        );

        const result = await client.fetchRegistry();
        assert.deepStrictEqual(result, registry);
      });

      it('returns empty object when registry does not exist', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        const result = await client.fetchRegistry();
        assert.deepStrictEqual(result, {});
      });
    });

    describe('saveRegistry', () => {
      it('saves registry', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const registry = { 'org/site/products': { lastUpdated: '2025-01-01' } };

        await client.saveRegistry(registry);

        const result = await ctx.env.CATALOG_BUCKET.get('.merchant-feed-registry.json');
        assert.ok(result);
        const data = await result.json();
        assert.deepStrictEqual(data, registry);
      });
    });
  });

  describe('Index Registry', () => {
    describe('fetchIndexRegistry', () => {
      it('returns empty registry with null etag when registry does not exist', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        const result = await client.fetchIndexRegistry('test-org', 'test-site');

        assert.deepStrictEqual(result.data, {});
        assert.strictEqual(result.etag, null);
      });

      it('fetches existing registry with etag', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const registryData = {
          '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' },
          '/us/en_us/index.json': { lastmod: '2025-01-07T01:00:00.000Z' },
        };

        // Manually add registry to storage
        await ctx.env.CATALOG_BUCKET.put(
          'test-org/test-site/indices/.registry.json',
          JSON.stringify(registryData),
        );

        const result = await client.fetchIndexRegistry('test-org', 'test-site');

        assert.deepStrictEqual(result.data, registryData);
        // etag should be present
        assert.ok(result.etag);
        assert.strictEqual(typeof result.etag, 'string');
      });

      it('handles different org/site combinations', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const registry1 = { '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' } };
        const registry2 = { '/items/index.json': { lastmod: '2025-01-07T02:00:00.000Z' } };

        await ctx.env.CATALOG_BUCKET.put(
          'org1/site1/indices/.registry.json',
          JSON.stringify(registry1),
        );
        await ctx.env.CATALOG_BUCKET.put(
          'org2/site2/indices/.registry.json',
          JSON.stringify(registry2),
        );

        const result1 = await client.fetchIndexRegistry('org1', 'site1');
        const result2 = await client.fetchIndexRegistry('org2', 'site2');

        assert.deepStrictEqual(result1.data, registry1);
        assert.deepStrictEqual(result2.data, registry2);
      });
    });

    describe('saveIndexRegistry', () => {
      it('saves registry without etag', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const registry = {
          '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' },
        };

        await client.saveIndexRegistry('test-org', 'test-site', registry);

        const result = await ctx.env.CATALOG_BUCKET.get('test-org/test-site/indices/.registry.json');
        assert.ok(result);
        const data = await result.json();
        assert.deepStrictEqual(data, registry);
      });

      it('saves registry with etag for conditional write', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const registry = {
          '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' },
        };

        await client.saveIndexRegistry('test-org', 'test-site', registry, 'test-etag');

        const result = await ctx.env.CATALOG_BUCKET.get('test-org/test-site/indices/.registry.json');
        assert.ok(result);
        const data = await result.json();
        assert.deepStrictEqual(data, registry);
      });

      it('updates existing registry', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const initialRegistry = {
          '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' },
        };
        const updatedRegistry = {
          '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' },
          '/us/en_us/index.json': { lastmod: '2025-01-07T01:00:00.000Z' },
        };

        await client.saveIndexRegistry('test-org', 'test-site', initialRegistry);
        await client.saveIndexRegistry('test-org', 'test-site', updatedRegistry);

        const result = await ctx.env.CATALOG_BUCKET.get('test-org/test-site/indices/.registry.json');
        const data = await result.json();
        assert.deepStrictEqual(data, updatedRegistry);
      });

      it('can remove entries from registry', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const initialRegistry = {
          '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' },
          '/us/en_us/index.json': { lastmod: '2025-01-07T01:00:00.000Z' },
        };
        const updatedRegistry = {
          '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' },
        };

        await client.saveIndexRegistry('test-org', 'test-site', initialRegistry);
        await client.saveIndexRegistry('test-org', 'test-site', updatedRegistry);

        const result = await ctx.env.CATALOG_BUCKET.get('test-org/test-site/indices/.registry.json');
        const data = await result.json();
        assert.deepStrictEqual(data, updatedRegistry);
        assert.strictEqual(data['/us/en_us/index.json'], undefined);
      });

      it('saves empty registry', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);

        await client.saveIndexRegistry('test-org', 'test-site', {});

        const result = await ctx.env.CATALOG_BUCKET.get('test-org/test-site/indices/.registry.json');
        const data = await result.json();
        assert.deepStrictEqual(data, {});
      });

      it('handles null etag', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const registry = {
          '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' },
        };

        await client.saveIndexRegistry('test-org', 'test-site', registry, null);

        const result = await ctx.env.CATALOG_BUCKET.get('test-org/test-site/indices/.registry.json');
        assert.ok(result);
        const data = await result.json();
        assert.deepStrictEqual(data, registry);
      });
    });

    describe('integration: fetch and save', () => {
      it('can fetch registry after saving', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const registry = {
          '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' },
          '/us/en_us/index.json': { lastmod: '2025-01-07T01:00:00.000Z' },
        };

        await client.saveIndexRegistry('test-org', 'test-site', registry);
        const result = await client.fetchIndexRegistry('test-org', 'test-site');

        assert.deepStrictEqual(result.data, registry);
        assert.ok(result.etag !== null);
      });

      it('simulates optimistic concurrency pattern', async () => {
        const ctx = CONTEXT();
        const client = new StorageClient(ctx);
        const initialRegistry = {
          '/products/index.json': { lastmod: '2025-01-07T00:00:00.000Z' },
        };

        // Save initial registry
        await client.saveIndexRegistry('test-org', 'test-site', initialRegistry);

        // Fetch with etag
        const { data: fetchedRegistry, etag } = await client.fetchIndexRegistry('test-org', 'test-site');

        // Modify and save with etag
        fetchedRegistry['/us/en_us/index.json'] = { lastmod: '2025-01-07T01:00:00.000Z' };
        await client.saveIndexRegistry('test-org', 'test-site', fetchedRegistry, etag);

        // Verify update
        const { data: updatedRegistry } = await client.fetchIndexRegistry('test-org', 'test-site');
        assert.strictEqual(Object.keys(updatedRegistry).length, 2);
        assert.ok(updatedRegistry['/products/index.json']);
        assert.ok(updatedRegistry['/us/en_us/index.json']);
      });
    });
  });
});
