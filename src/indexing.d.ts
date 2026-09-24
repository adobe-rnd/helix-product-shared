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

import type { IndexRegistry, IndexRegistryEntry } from './types/indices.js';
import type { IndexingJobProduct } from './types/jobs.js';

/** Allowed characters of a normalized index tag. */
export const INDEX_TAG_PATTERN: RegExp;
/** Maximum length of a normalized index tag. */
export const MAX_INDEX_TAG_LENGTH: number;
/** Maximum number of (normalized, deduplicated) `indexTags` on a product. */
export const MAX_INDEX_TAGS: number;

/** Trim and lowercase one index tag; non-strings are returned unchanged. */
export function normalizeIndexTag<T>(tag: T): T | string;

/**
 * Trim, lowercase and dedupe a product's `indexTags` (first occurrence wins).
 * Non-arrays are returned unchanged; invalid tags are kept for validation to reject.
 */
export function normalizeIndexTags<T>(tags: T): T | unknown[];

/** Whether a (normalized) value is a valid index tag. */
export function isValidIndexTag(tag: unknown): tag is string;

/** `/products/index.json` → `/products`; `/index.json` → `/`. */
export function indexKeyToRootPath(key: string): string;

/** `/products` → `/products/index.json`; `/` → `/index.json`. */
export function rootPathToIndexKey(rootPath: string): string;

/** Whether a registry entry is a tag-only index. */
export function isTaggedIndex(entry: IndexRegistryEntry | undefined): boolean;

/** Whether any index in the registry is tagged. */
export function hasTaggedIndices(registry: IndexRegistry | null | undefined): boolean;

/** Creation time (ms) from `created`, falling back to `lastmod`; unknown → 0. */
export function indexCreatedAt(entry: IndexRegistryEntry | undefined): number;

/** `tag → rootPath[]` (sorted) over the tagged entries of a registry. */
export function tagIndexMap(registry: IndexRegistry | null | undefined): Map<string, string[]>;

/** Closest untagged index at or above a directory; root path or null. */
export function closestPathIndex(
  registry: IndexRegistry | null | undefined,
  dirPath: string,
): string | null;

/** Closest untagged index for a product path (with or without `.json`). */
export function closestPathIndexForProduct(
  registry: IndexRegistry | null | undefined,
  productPath: string,
): string | null;

export interface IndexTargets {
  /** matched tagged indices (root paths, sorted) */
  tagged: string[];
  /** closest path index — the fallback — whether or not it is used */
  pathIndex: string | null;
  /** where the product belongs: `tagged` if non-empty, else `[pathIndex]`, else `[]` */
  targets: string[];
}

/** Resolve the indices a product belongs in. */
export function resolveIndexTargets(
  registry: IndexRegistry | null | undefined,
  product: { path: string; indexTags?: unknown },
  opts?: { tagMap?: Map<string, string[]> },
): IndexTargets;

export interface IndexingChange {
  path: string;
  action: 'update' | 'delete';
  /** stored product before the change (absent/null if it didn't exist), with its R2 `uploaded` time */
  prior?: { indexTags?: unknown; uploaded?: Date | number | string } | null;
  /** product being written (updates only) */
  next?: { indexTags?: unknown } | null;
  forceUpdate?: boolean;
}

/**
 * Plan targeted `{ path, action, rootPath }` jobs for one product write/delete:
 * upsert into new targets, remove from old targets that are no longer targets,
 * and evict from the path fallback when a late tagged index may have left the
 * product there (prior write older than the newest matched tagged index, or
 * `forceUpdate`).
 */
export function planIndexingJobs(
  registry: IndexRegistry | null | undefined,
  change: IndexingChange,
  opts?: { tagMap?: Map<string, string[]> },
): Array<IndexingJobProduct & { action: 'update' | 'delete'; rootPath: string }>;
