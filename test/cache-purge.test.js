/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import assert from 'node:assert/strict';
import * as cache from '../src/index.js';

const ORG = 'adobe';
const SITE = 'site1';
const SITE_KEY = cache.computeSiteKey(ORG, SITE);
const OPTIONS = [undefined, {}, { contentBusId: '' }, { contentBusId: 'content-bus' }];

describe('Cache key exports', () => {
  for (const resource of ['Product', 'Index', 'Sitemap', 'Media']) {
    it(`exports the deprecated ${resource} name as the same response-key function`, () => {
      assert.strictEqual(
        cache[`compute${resource}Keys`],
        cache[`compute${resource}ResponseKeys`],
      );
      assert.strictEqual(typeof cache[`compute${resource}ResponseKeys`], 'function');
    });
  }

  it('keeps the exact media response keys, including both group keys', async () => {
    assert.deepStrictEqual(
      await cache.computeMediaResponseKeys(ORG, SITE, './media_1234hash.jpg'),
      [SITE_KEY, `${SITE_KEY}_media`, `${SITE_KEY}/1234hash`],
    );
  });
});

describe('computePurgeKeys', () => {
  for (const path of ['/index.json', '/us/en/products/index.json', '/sitemap.xml', '/us/en/sitemap.xml']) {
    for (const options of OPTIONS) {
      it(`returns only the tagged path key for ${path} with ${JSON.stringify(options)}`, async () => {
        const keys = await cache.computePurgeKeys(ORG, SITE, path, options);
        const responseKeys = path.endsWith('/index.json')
          ? await cache.computeIndexResponseKeys(ORG, SITE, path)
          : await cache.computeSitemapResponseKeys(ORG, SITE, path);
        assert.deepStrictEqual(keys, [await cache.computeProductPathKey(ORG, SITE, path)]);
        assert.deepStrictEqual(responseKeys, [keys[0], SITE_KEY]);
      });
    }
  }

  for (const path of ['/products/blender', '/products/blender.json']) {
    for (const options of OPTIONS) {
      it(`purges both product representations for ${path} with ${JSON.stringify(options)}`, async () => {
        const variants = ['/products/blender', '/products/blender.json'];
        const expected = await Promise.all(
          variants.map((variant) => cache.computeProductPathKey(ORG, SITE, variant)),
        );
        if (options?.contentBusId) {
          expected.push(await cache.computeAuthoredContentKey(options.contentBusId, path));
        }
        const keys = await cache.computePurgeKeys(ORG, SITE, path, options);
        assert.deepStrictEqual(keys, expected);
        assert.ok(!keys.includes(SITE_KEY));
        assert.ok(!keys.includes(`${SITE_KEY}_head`));
        if (options?.contentBusId) {
          assert.ok(!keys.includes(`${options.contentBusId}_metadata`));
          assert.ok(!keys.includes(options.contentBusId));
        }

        const responses = await Promise.all(variants.map(
          (variant) => cache.computeProductResponseKeys(ORG, SITE, variant, options?.contentBusId),
        ));
        assert.strictEqual(keys[0], responses[0][0]);
        assert.strictEqual(keys[1], responses[1][0]);
        for (const responseKeys of responses) {
          assert.ok(responseKeys.includes(SITE_KEY));
          if (options?.contentBusId) {
            assert.ok(responseKeys.includes(`${SITE_KEY}_head`));
            assert.ok(responseKeys.includes(`${options.contentBusId}_metadata`));
            assert.ok(responseKeys.includes(options.contentBusId));
          }
        }
      });
    }
  }

  for (const options of OPTIONS) {
    it(`preserves the price-rules group key with ${JSON.stringify(options)}`, async () => {
      assert.deepStrictEqual(
        await cache.computePurgeKeys(ORG, SITE, '/_pricerules', options),
        [`${SITE_KEY}_pricerules`],
      );
    });
  }
});
