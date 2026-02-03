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
import {
  computeProductPathKey,
  computeSiteKey,
  compute404Key,
  computeMediaKeys,
  computeAuthoredContentKey,
  computeProductKeys,
} from '../src/cache.js';

describe('Cache Functions', () => {
  describe('computeProductPathKey', () => {
    it('computes surrogate key for valid product path parameters', async () => {
      const key = await computeProductPathKey('adobe', 'site1', '/products/blender-pro-500');
      assert.strictEqual(key, 'ZB7d8561tx75wQVt');
    });

    it('returns consistent keys for same inputs', async () => {
      const key1 = await computeProductPathKey('adobe', 'site1', '/products/blender-pro-500');
      const key2 = await computeProductPathKey('adobe', 'site1', '/products/blender-pro-500');
      assert.strictEqual(key1, key2);
    });

    it('returns different keys for different paths', async () => {
      const key1 = await computeProductPathKey('adobe', 'site1', '/products/blender-pro-500');
      const key2 = await computeProductPathKey('adobe', 'site1', '/products/mixer-pro-300');
      assert.notStrictEqual(key1, key2);
    });

    it('returns different keys for different orgs', async () => {
      const key1 = await computeProductPathKey('adobe', 'site1', '/products/blender-pro-500');
      const key2 = await computeProductPathKey('other-org', 'site1', '/products/blender-pro-500');
      assert.notStrictEqual(key1, key2);
    });

    it('returns different keys for different sites', async () => {
      const key1 = await computeProductPathKey('adobe', 'site1', '/products/blender-pro-500');
      const key2 = await computeProductPathKey('adobe', 'site2', '/products/blender-pro-500');
      assert.notStrictEqual(key1, key2);
    });
  });

  describe('computeSiteKey', () => {
    it('computes surrogate key for valid site parameters', () => {
      const key = computeSiteKey('adobe', 'site1');
      assert.strictEqual(key, 'main--site1--adobe');
    });

    it('handles special characters in parameters', () => {
      const key = computeSiteKey('adobe-rnd', 'site-with-dashes');
      assert.strictEqual(key, 'main--site-with-dashes--adobe-rnd');
    });
  });

  describe('computeAuthoredContentKey', () => {
    it('computes surrogate key for valid authored content parameters', async () => {
      const key = await computeAuthoredContentKey('contentBusId', '/path');
      assert.strictEqual(key, 'ToKrYWRYa0KMuObJ');
    });
  });

  describe('compute404Key', () => {
    it('computes surrogate key for valid 404 parameters', () => {
      const key = compute404Key('adobe', 'site1');
      assert.strictEqual(key, 'main--site1--adobe_404');
    });

    it('returns consistent keys for same inputs', () => {
      const key1 = compute404Key('adobe', 'site1');
      const key2 = compute404Key('adobe', 'site1');
      assert.strictEqual(key1, key2);
      assert.strictEqual(key1, 'main--site1--adobe_404');
    });

    it('returns different keys for different inputs', () => {
      const key1 = compute404Key('adobe', 'site1');
      const key2 = compute404Key('adobe', 'site2');
      assert.notStrictEqual(key1, key2);
      assert.strictEqual(key1, 'main--site1--adobe_404');
      assert.strictEqual(key2, 'main--site2--adobe_404');
    });
  });

  describe('computeMediaKeys', () => {
    it('computes surrogate key for valid media path parameters', async () => {
      const keys = await computeMediaKeys('adobe', 'site1', './media_1234hash.jpg');
      assert.ok(keys.includes('main--site1--adobe_media'));
      assert.ok(keys.includes('main--site1--adobe/1234hash'));
      assert.ok(keys.includes('main--site1--adobe'));
    });
  });

  describe('computeProductKeys', () => {
    it('computes keys without contentBusId', async () => {
      const keys = await computeProductKeys('adobe', 'site1', '/products/blender-pro-500');
      assert.strictEqual(keys.length, 2);
      assert.strictEqual(keys[0], 'ZB7d8561tx75wQVt'); // productPathKey
      assert.strictEqual(keys[1], 'main--site1--adobe'); // siteKey
    });

    it('computes keys with contentBusId', async () => {
      const keys = await computeProductKeys('adobe', 'site1', '/products/blender-pro-500', 'myContentBusId');
      assert.strictEqual(keys.length, 6);
      assert.strictEqual(keys[0], 'ZB7d8561tx75wQVt'); // productPathKey
      assert.strictEqual(keys[1], 'main--site1--adobe'); // siteKey
      // authoredContentKey
      const expectedAuthoredKey = await computeAuthoredContentKey('myContentBusId', '/products/blender-pro-500');
      assert.strictEqual(keys[2], expectedAuthoredKey);
      // additional content keys
      assert.strictEqual(keys[3], 'myContentBusId_metadata');
      assert.strictEqual(keys[4], 'main--site1--adobe_head');
      assert.strictEqual(keys[5], 'myContentBusId');
    });
  });
});
