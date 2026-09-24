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
 * One entry of a site's index registry (`{org}/{site}/indices/.registry.json`),
 * keyed by the index's `/dir/index.json` path.
 */
export interface IndexRegistryEntry {
  /**
   * ISO-8601 timestamp. Written once, when the index is created, and never
   * updated (entries are immutable), so it doubles as the creation time for
   * entries that predate `created`.
   */
  lastmod: string;
  /**
   * ISO-8601 creation timestamp. Set on entries created after tag-based index
   * splitting was introduced; older entries fall back to `lastmod`.
   */
  created?: string;
  /**
   * Normalized index tag. Its presence makes the index **tag-only**: products
   * whose `indexTags` include this tag are placed in it, and it is excluded
   * from path-based (closest ancestor directory) resolution. Unique across the
   * registry and immutable after creation.
   */
  tag?: string;
}

/**
 * A site's index registry: `/dir/index.json` key → entry. The root index is
 * keyed `/index.json`.
 */
export type IndexRegistry = Record<string, IndexRegistryEntry>;
