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

/**
 * Index resolution shared by the catalog write path (helix-commerce-api) and the
 * indexer, so both place a product in exactly the same indices.
 *
 * A product lands either in every **tagged** index whose `tag` is in its
 * `indexTags`, or — if it matches none — in its closest **path** index (the
 * nearest ancestor directory with a registered `index.json`). Never both.
 * Tagged indices are excluded from path resolution: a tagged index's path is its
 * storage identity only.
 *
 * Root paths use the indexer's convention: `/us/en_us/products`, and `/` for the
 * root index (registry key `/index.json`).
 *
 * @typedef {import('./types/index').IndexRegistry} IndexRegistry
 * @typedef {import('./types/index').IndexRegistryEntry} IndexRegistryEntry
 * @typedef {import('./types/index').IndexingJobProduct} IndexingJobProduct
 */

/** Allowed characters of a normalized index tag. */
export const INDEX_TAG_PATTERN = /^[a-z0-9][a-z0-9:_-]*$/;

/** Maximum length of a normalized index tag. */
export const MAX_INDEX_TAG_LENGTH = 64;

/** Maximum number of (normalized, deduplicated) `indexTags` on a product. */
export const MAX_INDEX_TAGS = 6;

const INDEX_SUFFIX = '/index.json';

/**
 * Normalize one index tag: trim and lowercase. Non-strings are returned
 * unchanged so validation can reject them.
 *
 * @template T
 * @param {T} tag
 * @returns {T | string}
 */
export function normalizeIndexTag(tag) {
  return typeof tag === 'string' ? tag.trim().toLowerCase() : tag;
}

/**
 * Normalize a product's `indexTags`: trim and lowercase each tag, then dedupe
 * (first occurrence wins). Anything that isn't an array is returned unchanged so
 * validation can reject it. Trim, lowercase and dedupe are the only silent
 * changes; invalid tags are left in place to be rejected.
 *
 * @template T
 * @param {T} tags
 * @returns {T | unknown[]}
 */
export function normalizeIndexTags(tags) {
  if (!Array.isArray(tags)) {
    return tags;
  }
  const seen = new Set();
  const result = [];
  for (const tag of tags.map(normalizeIndexTag)) {
    const key = typeof tag === 'string' ? tag : undefined;
    if (key === undefined || !seen.has(key)) {
      if (key !== undefined) seen.add(key);
      result.push(tag);
    }
  }
  return result;
}

/**
 * Whether a (normalized) value is a valid index tag.
 *
 * @param {unknown} tag
 * @returns {tag is string}
 */
export function isValidIndexTag(tag) {
  return typeof tag === 'string'
    && tag.length <= MAX_INDEX_TAG_LENGTH
    && INDEX_TAG_PATTERN.test(tag);
}

/**
 * `/products/index.json` → `/products`; `/index.json` → `/`.
 *
 * @param {string} key registry key
 * @returns {string} root path
 */
export function indexKeyToRootPath(key) {
  const rootPath = key.endsWith(INDEX_SUFFIX) ? key.slice(0, -INDEX_SUFFIX.length) : key;
  return rootPath || '/';
}

/**
 * `/products` → `/products/index.json`; `/` → `/index.json`.
 *
 * @param {string} rootPath
 * @returns {string} registry key
 */
export function rootPathToIndexKey(rootPath) {
  return `${rootPath === '/' ? '' : rootPath}${INDEX_SUFFIX}`;
}

/**
 * Whether a registry entry is a tag-only index.
 *
 * @param {IndexRegistryEntry | undefined} entry
 * @returns {boolean}
 */
export function isTaggedIndex(entry) {
  return typeof entry?.tag === 'string' && entry.tag.length > 0;
}

/**
 * Whether any index in the registry is tagged.
 *
 * @param {IndexRegistry | null | undefined} registry
 * @returns {boolean}
 */
export function hasTaggedIndices(registry) {
  return Object.values(registry ?? {}).some(isTaggedIndex);
}

/**
 * Creation time of an index, in ms since epoch. Uses `created`, falling back to
 * `lastmod` (which is only written at creation). Unknown/unparseable → 0.
 *
 * @param {IndexRegistryEntry | undefined} entry
 * @returns {number}
 */
export function indexCreatedAt(entry) {
  const ms = Date.parse(entry?.created ?? entry?.lastmod ?? '');
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Build `tag → rootPath[]` over the tagged entries of a registry. Build it once
 * per registry and pass it to `resolveIndexTargets` when resolving many
 * products.
 *
 * @param {IndexRegistry | null | undefined} registry
 * @returns {Map<string, string[]>} root paths sorted ascending
 */
export function tagIndexMap(registry) {
  /** @type {Map<string, string[]>} */
  const map = new Map();
  for (const [key, entry] of Object.entries(registry ?? {})) {
    if (isTaggedIndex(entry)) {
      const roots = map.get(entry.tag) ?? [];
      roots.push(indexKeyToRootPath(key));
      map.set(entry.tag, roots);
    }
  }
  map.forEach((roots) => roots.sort());
  return map;
}

/**
 * Closest **path** index for a directory: walk from the directory up to the
 * root and return the first ancestor with a registered, untagged `index.json`.
 *
 * @param {IndexRegistry | null | undefined} registry
 * @param {string} dirPath directory, e.g. `/us/en_us/products` or `/`
 * @returns {string | null} root path of the index, or null
 */
export function closestPathIndex(registry, dirPath) {
  const reg = registry ?? {};
  const parts = dirPath.split('/').filter(Boolean);
  parts.unshift(''); // joined path always starts with a slash
  while (parts.length) {
    const key = `${parts.join('/')}${INDEX_SUFFIX}`;
    const entry = reg[key];
    if (entry && !isTaggedIndex(entry)) {
      return indexKeyToRootPath(key);
    }
    parts.pop();
  }
  return null;
}

/**
 * Closest **path** index for a product path (with or without `.json`).
 *
 * @param {IndexRegistry | null | undefined} registry
 * @param {string} productPath
 * @returns {string | null} root path of the index, or null
 */
export function closestPathIndexForProduct(registry, productPath) {
  const dirPath = productPath.split('/').slice(0, -1).join('/') || '/';
  return closestPathIndex(registry, dirPath);
}

/**
 * Resolve the indices a product belongs in.
 *
 * @param {IndexRegistry | null | undefined} registry
 * @param {{ path: string, indexTags?: unknown }} product
 * @param {{ tagMap?: Map<string, string[]> }} [opts] precomputed `tagIndexMap(registry)`
 * @returns {{
 *   tagged: string[],
 *   pathIndex: string | null,
 *   targets: string[],
 * }} `tagged`: matched tagged indices (sorted); `pathIndex`: the closest path
 *   index (the fallback), whether or not it is used; `targets`: where the product
 *   belongs — `tagged` if non-empty, else `[pathIndex]`, else `[]`
 */
export function resolveIndexTargets(registry, product, opts = {}) {
  const tagMap = opts.tagMap ?? tagIndexMap(registry);
  const tagged = new Set();
  const tags = normalizeIndexTags(product.indexTags);
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (typeof tag === 'string') {
        (tagMap.get(tag) ?? []).forEach((root) => tagged.add(root));
      }
    }
  }
  const sortedTagged = [...tagged].sort();
  const pathIndex = closestPathIndexForProduct(registry, product.path);
  let targets = [];
  if (sortedTagged.length) {
    targets = sortedTagged;
  } else if (pathIndex) {
    targets = [pathIndex];
  }
  return { tagged: sortedTagged, pathIndex, targets };
}

/**
 * @param {Date | number | string | undefined | null} value
 * @returns {number} ms since epoch, or NaN
 */
function toMs(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value);
  return NaN;
}

/**
 * Plan the targeted indexing jobs for one product write or delete, from the
 * product's state before and after the change, against the current registry.
 *
 * - **update**: upsert into every new target; remove from every old target that
 *   is no longer a target.
 * - **delete**: remove from every old target. Without a prior body (the product
 *   is already gone) only its path index can be targeted.
 * - **Late tagged index eviction**: when the product resolves to tagged indices,
 *   also remove it from its path fallback if it may still be there — i.e. its
 *   prior object was written before the newest of those tagged indices was
 *   created (so it landed in the path index then), or on `forceUpdate`.
 *
 * @param {IndexRegistry | null | undefined} registry
 * @param {{
 *   path: string,
 *   action: 'update' | 'delete',
 *   prior?: { indexTags?: unknown, uploaded?: Date | number | string } | null,
 *   next?: { indexTags?: unknown } | null,
 *   forceUpdate?: boolean,
 * }} change `prior`: the stored product before the change (null/absent when it
 *   didn't exist), with its R2 `uploaded` time; `next`: the product being written
 *   (updates only)
 * @param {{ tagMap?: Map<string, string[]> }} [opts]
 * @returns {IndexingJobProduct[]} `{ path, action: 'update' | 'delete', rootPath }`
 */
export function planIndexingJobs(registry, change, opts = {}) {
  const {
    path, action, prior, next, forceUpdate = false,
  } = change;
  const tagMap = opts.tagMap ?? tagIndexMap(registry);

  const nextResolution = action === 'update'
    ? resolveIndexTargets(registry, { path, indexTags: next?.indexTags }, { tagMap })
    : null;
  const priorResolution = prior
    ? resolveIndexTargets(registry, { path, indexTags: prior.indexTags }, { tagMap })
    : null;

  const upserts = nextResolution?.targets ?? [];
  /** @type {Set<string>} */
  const removes = new Set();
  if (priorResolution) {
    priorResolution.targets.forEach((root) => removes.add(root));
  } else if (action === 'delete') {
    const pathIndex = closestPathIndexForProduct(registry, path);
    if (pathIndex) removes.add(pathIndex);
  }

  // late tagged index: evict from the path fallback it may have landed in
  const current = nextResolution ?? priorResolution;
  if (current?.tagged.length && current.pathIndex) {
    const newestTagged = Math.max(
      ...current.tagged.map((root) => indexCreatedAt(registry?.[rootPathToIndexKey(root)])),
    );
    const priorWrittenAt = toMs(prior?.uploaded);
    if (forceUpdate || (prior && !(priorWrittenAt >= newestTagged))) {
      removes.add(current.pathIndex);
    }
  }

  upserts.forEach((root) => removes.delete(root));

  return [
    ...upserts.map((rootPath) => ({ path, action: 'update', rootPath })),
    ...[...removes].sort().map((rootPath) => ({ path, action: 'delete', rootPath })),
  ];
}
