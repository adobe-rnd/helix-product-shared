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
 * Compute the surrogate key for a product path.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param path - The product path (e.g., /products/blender-pro-500)
 * @returns A promise that resolves to the computed surrogate key
 */
export function computeProductPathKey(
  org: string,
  site: string,
  path: string
): Promise<string>;

/**
 * Return the cacheable URL path variants for a Commerce product.
 * @param path - The product path with or without a .json extension
 * @returns Extensionless and .json product path variants
 */
export function getProductPathVariants(path: string): string[];

/**
 * Compute the surrogate key for an authored content inserted in the pipeline.
 * @param contentBusId The content bus id of the authored content
 * @param path The path of the authored content
 * @returns A promise that resolves to the computed surrogate key
 */
export function computeAuthoredContentKey(contentBusId: string, path: string): Promise<string>;

/**
 * Compute the surrogate key for a site.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @returns The computed surrogate key
 */
export function computeSiteKey(
  org: string,
  site: string
): string;

/**
 * Compute the surrogate key for a 404.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @returns The computed surrogate key
 */
export function compute404Key(
  org: string,
  site: string
): string;

/**
 * Compute the surrogate key for catalog price rules.
 * Applied to index and sitemap responses so they can all be invalidated together
 * when price rules change.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @returns The computed surrogate key
 */
export function computePriceRulesKey(
  org: string,
  site: string
): string;

/**
 * Compute the keys attached to a cached product response.
 * Includes site and dependency keys. Use computePurgeKeys for product changes.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param path - The product path (e.g., /products/blender-pro-500)
 * @param contentBusId - Optional content bus ID for authored content keys
 * @returns A promise that resolves to an array of computed surrogate keys
 */
export function computeProductResponseKeys(
  org: string,
  site: string,
  path: string,
  contentBusId?: string
): Promise<string[]>;

/**
 * Compute the keys attached to a cached media response.
 * Includes site and media group keys. Not a resource-specific purge list.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param path - The path of the media resource
 * @returns A promise that resolves to an array of computed surrogate keys
 */
export function computeMediaResponseKeys(
  org: string,
  site: string,
  path: string
): Promise<string[]>;

/**
 * Compute the keys attached to a cached sitemap.xml response.
 * Includes the site key. Use computePurgeKeys for sitemap changes.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param path - The sitemap path (e.g., /us/en/sitemap.xml)
 * @returns A promise that resolves to an array of computed surrogate keys
 */
export function computeSitemapResponseKeys(
  org: string,
  site: string,
  path: string
): Promise<string[]>;

/**
 * Compute the keys attached to a cached index.json response.
 * Includes the site key. Use computePurgeKeys for index changes.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param path - The index path (e.g., /us/en/products/index.json)
 * @returns A promise that resolves to an array of computed surrogate keys
 */
export function computeIndexResponseKeys(
  org: string,
  site: string,
  path: string
): Promise<string[]>;

/** @deprecated Use computeProductResponseKeys for response tagging. */
export const computeProductKeys: typeof computeProductResponseKeys;

/** @deprecated Use computeIndexResponseKeys for response tagging. */
export const computeIndexKeys: typeof computeIndexResponseKeys;

/** @deprecated Use computeSitemapResponseKeys for response tagging. */
export const computeSitemapKeys: typeof computeSitemapResponseKeys;

/** @deprecated Use computeMediaResponseKeys for response tagging. */
export const computeMediaKeys: typeof computeMediaResponseKeys;

/**
 * Compute purge keys for product, index.json, sitemap.xml, or /_pricerules paths.
 * Never includes the site key. Other resources, including media, are unsupported.
 * Unrecognized paths are treated as product paths, not rejected.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param path - A supported resource path; input is not validated
 * @param options - Optional authored-content configuration
 */
export function computePurgeKeys(
  org: string,
  site: string,
  path: string,
  options?: { contentBusId?: string }
): Promise<string[]>;
