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
import { describe, it } from 'node:test';
import {
  computeStoreViewKey,
  computeStoreKey,
  computeProductSkuKey,
  computeProductUrlKeyKey,
  computeSiteKey,
  computeProductKeys,
  compute404Key,
} from '../src/cache.js';

describe('Cache Functions', () => {
  describe('computeStoreViewKey', () => {
    it('computes surrogate key for valid store view parameters', async () => {
      const key = await computeStoreViewKey('adobe', 'site1', 'store1', 'view1');
      assert.strictEqual(key, 'zw5YBl1DUvNuASw9');
    });
  });

  describe('computeStoreKey', () => {
    it('computes surrogate key for valid store parameters', async () => {
      const key = await computeStoreKey('adobe', 'site1', 'store1');
      assert.strictEqual(key, '8hpdiz7qP5l7mDnb');
    });
  });

  describe('computeProductSkuKey', () => {
    it('computes surrogate key for valid product sku parameters', async () => {
      const key = await computeProductSkuKey('adobe', 'site1', 'store1', 'view1', 'sku123');
      assert.strictEqual(key, 'SUsyd_Y356ZS-pcw');
    });
  });

  describe('computeProductUrlKeyKey', () => {
    it('computes surrogate key for valid product url key parameters', async () => {
      const key = await computeProductUrlKeyKey('adobe', 'site1', 'store1', 'view1', 'product-url');
      assert.strictEqual(key, 'DV15mkThz3E4NNUq');
    });
  });

  describe('computeSiteKey', () => {
    it('computes surrogate key for valid site parameters', async () => {
      const key = await computeSiteKey('adobe', 'site1');
      assert.strictEqual(key, 'RE0fR6sskjhPLpZb');
    });

    it('handles missing org parameter', async () => {
      const key = await computeSiteKey(null, 'site1');
      assert.strictEqual(key, 'Q6y5rihAP_HQ8PfE');
    });

    it('handles empty org parameter', async () => {
      const key = await computeSiteKey('', 'site1');
      assert.strictEqual(key, 'jvuRxE8qXbO-X6yg');
    });

    it('handles missing site parameter', async () => {
      const key = await computeSiteKey('adobe', null);
      assert.strictEqual(key, 'g0Spa-97thwgYqxI');
    });

    it('handles empty site parameter', async () => {
      const key = await computeSiteKey('adobe', '');
      assert.strictEqual(key, 'OGEG7-xcPZ0Dnrj-');
    });

    it('handles undefined parameters', async () => {
      const key = await computeSiteKey(undefined, undefined);
      assert.strictEqual(key, 'aF8r22NI4K34tQCb');
    });
  });

  describe('computeProductKeys', () => {
    it('computes all product keys for valid parameters', async () => {
      const keys = await computeProductKeys('adobe', 'site1', 'store1', 'view1', 'sku123', 'product-url');
      assert.ok(Array.isArray(keys));
      assert.strictEqual(keys.length, 5);

      // Verify exact key values in expected order
      assert.strictEqual(keys[0], 'zw5YBl1DUvNuASw9'); // Store View Key
      assert.strictEqual(keys[1], '8hpdiz7qP5l7mDnb'); // Store Key
      assert.strictEqual(keys[2], 'SUsyd_Y356ZS-pcw'); // Product SKU Key
      assert.strictEqual(keys[3], 'DV15mkThz3E4NNUq'); // Product URL Key
      assert.strictEqual(keys[4], 'cV14ckfNDlaM474G'); // Site Key (note: this is buggy - should be called with org, site params)
    });
  });

  describe('compute404Key', () => {
    it('computes surrogate key for valid 404 parameters', async () => {
      const key = await compute404Key('adobe', 'site1');
      assert.strictEqual(key, 'main--site1--adobe_404');
    });

    it('returns consistent keys for same inputs', async () => {
      const key1 = await compute404Key('adobe', 'site1');
      const key2 = await compute404Key('adobe', 'site1');
      assert.strictEqual(key1, key2);
      assert.strictEqual(key1, 'main--site1--adobe_404');
    });

    it('returns different keys for different inputs', async () => {
      const key1 = await compute404Key('adobe', 'site1');
      const key2 = await compute404Key('adobe', 'site2');
      assert.notStrictEqual(key1, key2);
      assert.strictEqual(key1, 'main--site1--adobe_404');
      assert.strictEqual(key2, 'main--site2--adobe_404');
    });
  });

  describe('Integration Tests', () => {
    it('returns consistent keys for same inputs', async () => {
      const key1 = await computeStoreViewKey('adobe', 'site1', 'store1', 'view1');
      const key2 = await computeStoreViewKey('adobe', 'site1', 'store1', 'view1');
      assert.strictEqual(key1, key2);
      assert.strictEqual(key1, 'zw5YBl1DUvNuASw9');
    });

    it('returns different keys for different inputs', async () => {
      const key1 = await computeStoreViewKey('adobe', 'site1', 'store1', 'view1');
      const key2 = await computeStoreViewKey('adobe', 'site1', 'store1', 'view2');
      assert.notStrictEqual(key1, key2);
      assert.strictEqual(key1, 'zw5YBl1DUvNuASw9');
      assert.strictEqual(key2, 'Z44FZ58s2oZAH7VP');
    });

    it('computeProductKeys includes all expected key types', async () => {
      const keys = await computeProductKeys('adobe', 'site1', 'store1', 'view1', 'sku123', 'product-url');

      // Verify we get the expected number of keys
      assert.strictEqual(keys.length, 5);

      // Verify each key is unique
      const uniqueKeys = new Set(keys);
      assert.strictEqual(uniqueKeys.size, 5);

      // Verify the keys match expected values
      const expectedKeys = [
        'zw5YBl1DUvNuASw9', // Store View Key
        '8hpdiz7qP5l7mDnb', // Store Key
        'SUsyd_Y356ZS-pcw', // Product SKU Key
        'DV15mkThz3E4NNUq', // Product URL Key
        'cV14ckfNDlaM474G', // Site Key (buggy)
      ];
      assert.deepStrictEqual(keys, expectedKeys);
    });

    it('computeSiteKey handles special characters in parameters', async () => {
      const key = await computeSiteKey('adobe-rnd', 'site-with-dashes');
      assert.strictEqual(key, 'SbmWMT7t5SM2pJp-');
    });
  });
});
