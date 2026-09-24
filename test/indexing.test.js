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

import assert from 'node:assert';
import {
  INDEX_TAG_PATTERN,
  MAX_INDEX_TAG_LENGTH,
  MAX_INDEX_TAGS,
  normalizeIndexTag,
  normalizeIndexTags,
  isValidIndexTag,
  indexKeyToRootPath,
  rootPathToIndexKey,
  isTaggedIndex,
  hasTaggedIndices,
  indexCreatedAt,
  tagIndexMap,
  closestPathIndex,
  closestPathIndexForProduct,
  resolveIndexTargets,
  planIndexingJobs,
} from '../src/index.js';

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-02-01T00:00:00.000Z';
const BEFORE_T1 = Date.parse('2026-01-15T00:00:00.000Z');
const AFTER_T1 = Date.parse('2026-03-01T00:00:00.000Z');

/** path indices at / and /products, tagged indices `sale` and `new` */
const REGISTRY = {
  '/index.json': { lastmod: T0 },
  '/products/index.json': { lastmod: T0 },
  '/sale/index.json': { lastmod: T1, created: T1, tag: 'sale' },
  '/new/index.json': { lastmod: T0, tag: 'new' },
};

describe('indexing', () => {
  describe('tag normalization & validation', () => {
    it('exposes the limits', () => {
      assert.strictEqual(MAX_INDEX_TAGS, 6);
      assert.strictEqual(MAX_INDEX_TAG_LENGTH, 64);
      assert.ok(INDEX_TAG_PATTERN.test('sale:2026'));
    });

    it('trims and lowercases a tag, leaving non-strings alone', () => {
      assert.strictEqual(normalizeIndexTag('  SALE '), 'sale');
      assert.strictEqual(normalizeIndexTag(42), 42);
    });

    it('normalizes and dedupes indexTags, keeping first-seen order', () => {
      assert.deepStrictEqual(
        normalizeIndexTags([' Sale', 'new', 'SALE', 'sale ', 'New']),
        ['sale', 'new'],
      );
    });

    it('keeps invalid entries (for validation to reject) and passes non-arrays through', () => {
      assert.deepStrictEqual(normalizeIndexTags(['a', 1, 1, '']), ['a', 1, 1, '']);
      assert.strictEqual(normalizeIndexTags('sale'), 'sale');
      assert.strictEqual(normalizeIndexTags(undefined), undefined);
    });

    it('validates normalized tags', () => {
      ['sale', 'sale:2026', 'a_b-c', '0', 'x'.repeat(64)].forEach((tag) => {
        assert.ok(isValidIndexTag(tag), tag);
      });
      ['', 'Sale', ' sale', 'on sale', '-sale', ':x', 'sale!', 'x'.repeat(65), 1, null].forEach((tag) => {
        assert.ok(!isValidIndexTag(tag), String(tag));
      });
    });
  });

  describe('registry helpers', () => {
    it('converts between registry keys and root paths', () => {
      assert.strictEqual(indexKeyToRootPath('/products/index.json'), '/products');
      assert.strictEqual(indexKeyToRootPath('/index.json'), '/');
      assert.strictEqual(indexKeyToRootPath('/products'), '/products');
      assert.strictEqual(rootPathToIndexKey('/products'), '/products/index.json');
      assert.strictEqual(rootPathToIndexKey('/'), '/index.json');
    });

    it('identifies tagged indices', () => {
      assert.ok(isTaggedIndex({ lastmod: T0, tag: 'sale' }));
      assert.ok(!isTaggedIndex({ lastmod: T0 }));
      assert.ok(!isTaggedIndex({ lastmod: T0, tag: '' }));
      assert.ok(!isTaggedIndex(undefined));
      assert.ok(hasTaggedIndices(REGISTRY));
      assert.ok(!hasTaggedIndices({ '/index.json': { lastmod: T0 } }));
      assert.ok(!hasTaggedIndices(null));
    });

    it('reads creation time from created, falling back to lastmod', () => {
      assert.strictEqual(indexCreatedAt({ lastmod: T0, created: T1 }), Date.parse(T1));
      assert.strictEqual(indexCreatedAt({ lastmod: T0 }), Date.parse(T0));
      assert.strictEqual(indexCreatedAt({ lastmod: 'garbage' }), 0);
      assert.strictEqual(indexCreatedAt(undefined), 0);
    });

    it('maps tags to sorted root paths', () => {
      const map = tagIndexMap({
        ...REGISTRY,
        // not unique in practice (create enforces it), but the map tolerates it
        '/b-sale/index.json': { lastmod: T0, tag: 'sale' },
      });
      assert.deepStrictEqual(map.get('sale'), ['/b-sale', '/sale']);
      assert.deepStrictEqual(map.get('new'), ['/new']);
      assert.strictEqual(map.size, 2);
      assert.strictEqual(tagIndexMap(undefined).size, 0);
    });
  });

  describe('closestPathIndex', () => {
    it('walks up to the closest ancestor index', () => {
      assert.strictEqual(closestPathIndex(REGISTRY, '/products/shoes/nested'), '/products');
      assert.strictEqual(closestPathIndex(REGISTRY, '/products'), '/products');
      assert.strictEqual(closestPathIndex(REGISTRY, '/other'), '/');
      assert.strictEqual(closestPathIndex(REGISTRY, '/'), '/');
    });

    it('skips tagged indices', () => {
      // /sale is tagged, so products under it fall back to the root index
      assert.strictEqual(closestPathIndex(REGISTRY, '/sale'), '/');
      assert.strictEqual(closestPathIndex({ '/sale/index.json': { lastmod: T0, tag: 'sale' } }, '/sale'), null);
    });

    it('does not treat a sibling prefix as an ancestor', () => {
      const registry = { '/products/index.json': { lastmod: T0 } };
      assert.strictEqual(closestPathIndex(registry, '/productsxl'), null);
    });

    it('returns null for an empty or missing registry', () => {
      assert.strictEqual(closestPathIndex({}, '/products'), null);
      assert.strictEqual(closestPathIndex(null, '/products'), null);
    });

    it('resolves from a product path, with or without .json', () => {
      assert.strictEqual(closestPathIndexForProduct(REGISTRY, '/products/shoes/p1'), '/products');
      assert.strictEqual(closestPathIndexForProduct(REGISTRY, '/products/p1.json'), '/products');
      assert.strictEqual(closestPathIndexForProduct(REGISTRY, '/p1'), '/');
      const noRoot = { '/products/index.json': { lastmod: T0 } };
      assert.strictEqual(closestPathIndexForProduct(noRoot, '/p1'), null);
    });
  });

  describe('resolveIndexTargets', () => {
    it('places a product with no tags in its path index', () => {
      assert.deepStrictEqual(resolveIndexTargets(REGISTRY, { path: '/products/p1' }), {
        tagged: [], pathIndex: '/products', targets: ['/products'],
      });
    });

    it('places a tagged product only in its tagged indices (tag overrides path)', () => {
      assert.deepStrictEqual(
        resolveIndexTargets(REGISTRY, { path: '/products/p1', indexTags: ['sale', 'new'] }),
        { tagged: ['/new', '/sale'], pathIndex: '/products', targets: ['/new', '/sale'] },
      );
    });

    it('falls back to the path index when no tag matches a tagged index', () => {
      assert.deepStrictEqual(
        resolveIndexTargets(REGISTRY, { path: '/products/p1', indexTags: ['unknown'] }).targets,
        ['/products'],
      );
    });

    it('normalizes product tags and ignores non-string entries', () => {
      assert.deepStrictEqual(
        resolveIndexTargets(REGISTRY, { path: '/products/p1', indexTags: [' SALE ', 7] }).targets,
        ['/sale'],
      );
      assert.deepStrictEqual(
        resolveIndexTargets(REGISTRY, { path: '/products/p1', indexTags: 'sale' }).targets,
        ['/products'],
      );
    });

    it('returns no targets when nothing matches', () => {
      assert.deepStrictEqual(resolveIndexTargets({}, { path: '/products/p1', indexTags: ['sale'] }), {
        tagged: [], pathIndex: null, targets: [],
      });
      assert.deepStrictEqual(resolveIndexTargets(null, { path: '/p1' }).targets, []);
    });

    it('accepts a precomputed tag map', () => {
      const tagMap = new Map([['sale', ['/elsewhere']]]);
      assert.deepStrictEqual(
        resolveIndexTargets(REGISTRY, { path: '/products/p1', indexTags: ['sale'] }, { tagMap }).targets,
        ['/elsewhere'],
      );
    });
  });

  describe('planIndexingJobs', () => {
    const plan = (change) => planIndexingJobs(REGISTRY, { path: '/products/p1', ...change });
    const update = (rootPath) => ({ path: '/products/p1', action: 'update', rootPath });
    const remove = (rootPath) => ({ path: '/products/p1', action: 'delete', rootPath });

    it('create, untagged → upsert into the path index', () => {
      assert.deepStrictEqual(plan({ action: 'update', next: {} }), [update('/products')]);
    });

    it('create, tagged → upsert into the tagged indices only', () => {
      assert.deepStrictEqual(
        plan({ action: 'update', next: { indexTags: ['sale', 'new'] } }),
        [update('/new'), update('/sale')],
      );
    });

    it('update, targets unchanged → re-upsert, no removes', () => {
      assert.deepStrictEqual(
        plan({
          action: 'update', prior: { indexTags: ['new'], uploaded: AFTER_T1 }, next: { indexTags: ['new'] },
        }),
        [update('/new')],
      );
    });

    it('existing untagged product gains a tag → upsert tagged, remove from path index', () => {
      assert.deepStrictEqual(
        plan({ action: 'update', prior: { uploaded: AFTER_T1 }, next: { indexTags: ['sale'] } }),
        [update('/sale'), remove('/products')],
      );
    });

    it('tag added → upsert into both, stays in the other', () => {
      assert.deepStrictEqual(
        plan({
          action: 'update',
          prior: { indexTags: ['new'], uploaded: AFTER_T1 },
          next: { indexTags: ['new', 'sale'] },
        }),
        [update('/new'), update('/sale')],
      );
    });

    it('tag removed → remove from that index only', () => {
      assert.deepStrictEqual(
        plan({
          action: 'update',
          prior: { indexTags: ['new', 'sale'], uploaded: AFTER_T1 },
          next: { indexTags: ['new'] },
        }),
        [update('/new'), remove('/sale')],
      );
    });

    it('all tags removed → remove from tagged indices, upsert into the path index', () => {
      assert.deepStrictEqual(
        plan({
          action: 'update', prior: { indexTags: ['new', 'sale'], uploaded: AFTER_T1 }, next: {},
        }),
        [update('/products'), remove('/new'), remove('/sale')],
      );
    });

    it('late tagged index: prior written before the index existed → evict from the path fallback', () => {
      // tagged `sale` before /sale existed (created T1), so it landed in /products
      assert.deepStrictEqual(
        plan({
          action: 'update', prior: { indexTags: ['sale'], uploaded: BEFORE_T1 }, next: { indexTags: ['sale'] },
        }),
        [update('/sale'), remove('/products')],
      );
    });

    it('late tagged index uses the newest matched index and accepts Date/string times', () => {
      // /new predates the write, /sale doesn't → still evict
      assert.deepStrictEqual(
        plan({
          action: 'update',
          prior: { indexTags: ['new', 'sale'], uploaded: new Date(BEFORE_T1) },
          next: { indexTags: ['new', 'sale'] },
        }),
        [update('/new'), update('/sale'), remove('/products')],
      );
      assert.deepStrictEqual(
        plan({
          action: 'update',
          prior: { indexTags: ['sale'], uploaded: new Date(AFTER_T1).toISOString() },
          next: { indexTags: ['sale'] },
        }),
        [update('/sale')],
        'written after the index existed → nothing to evict',
      );
    });

    it('evicts when the prior write time is unknown, and always on forceUpdate', () => {
      assert.deepStrictEqual(
        plan({ action: 'update', prior: { indexTags: ['sale'] }, next: { indexTags: ['sale'] } }),
        [update('/sale'), remove('/products')],
      );
      assert.deepStrictEqual(
        plan({
          action: 'update',
          prior: { indexTags: ['sale'], uploaded: AFTER_T1 },
          next: { indexTags: ['sale'] },
          forceUpdate: true,
        }),
        [update('/sale'), remove('/products')],
      );
    });

    it('does not evict on create (no prior) unless forced', () => {
      assert.deepStrictEqual(plan({ action: 'update', next: { indexTags: ['sale'] } }), [update('/sale')]);
      assert.deepStrictEqual(
        plan({ action: 'update', next: { indexTags: ['sale'] }, forceUpdate: true }),
        [update('/sale'), remove('/products')],
      );
    });

    it('does not evict when there is no path fallback', () => {
      const registry = { '/sale/index.json': { lastmod: T1, tag: 'sale' } };
      assert.deepStrictEqual(
        planIndexingJobs(registry, {
          path: '/products/p1',
          action: 'update',
          prior: { indexTags: ['sale'], uploaded: BEFORE_T1 },
          next: { indexTags: ['sale'] },
        }),
        [update('/sale')],
      );
    });

    it('produces no jobs when the product resolves to no index', () => {
      assert.deepStrictEqual(
        planIndexingJobs({}, { path: '/products/p1', action: 'update', next: { indexTags: ['sale'] } }),
        [],
      );
    });

    it('delete with body → remove from the old targets', () => {
      assert.deepStrictEqual(
        plan({ action: 'delete', prior: { indexTags: ['new'], uploaded: AFTER_T1 } }),
        [remove('/new')],
      );
      assert.deepStrictEqual(
        plan({ action: 'delete', prior: { uploaded: AFTER_T1 } }),
        [remove('/products')],
      );
    });

    it('delete of a late-tagged product also evicts it from the path fallback', () => {
      assert.deepStrictEqual(
        plan({ action: 'delete', prior: { indexTags: ['sale'], uploaded: BEFORE_T1 } }),
        [remove('/products'), remove('/sale')],
      );
    });

    it('delete without a body (already gone) → path index only', () => {
      assert.deepStrictEqual(plan({ action: 'delete' }), [remove('/products')]);
      assert.deepStrictEqual(
        planIndexingJobs({}, { path: '/products/p1', action: 'delete' }),
        [],
      );
    });

    it('accepts a precomputed tag map', () => {
      const tagMap = tagIndexMap(REGISTRY);
      assert.deepStrictEqual(
        planIndexingJobs(REGISTRY, { path: '/products/p1', action: 'update', next: { indexTags: ['new'] } }, { tagMap }),
        [update('/new')],
      );
    });
  });
});
