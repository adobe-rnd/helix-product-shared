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

import { computeSurrogateKey } from '@adobe/helix-shared-utils';

/**
 * Compute the surrogate key for a product path.
 * @param {string} org
 * @param {string} site
 * @param {string} path - The product path (e.g., /products/blender-pro-500)
 * @returns {Promise<string>}
 */
export async function computeProductPathKey(org, site, path) {
  return computeSurrogateKey(`/${org}/${site}${path}`);
}

/**
 * Return the cacheable URL path variants for a Commerce product.
 *
 * @param {string} path - The product path with or without a .json extension
 * @returns {string[]} Extensionless and .json product path variants
 */
export function getProductPathVariants(path) {
  const extensionless = path.endsWith('.json')
    ? path.slice(0, -'.json'.length)
    : path;
  return [extensionless, `${extensionless}.json`];
}

/**
 * Compute the surrogate key for an authored content inserted in the pipeline.
 * @param {string} contentBusId The content bus id of the authored content
 * @param {string} path The path of the authored content
 * @returns {Promise<string>} A promise that resolves to the computed surrogate key
 */
export async function computeAuthoredContentKey(contentBusId, path) {
  return computeSurrogateKey(`${contentBusId}${path}`);
}

/**
 * Compute the surrogate key for a site.
 * @param {string} org
 * @param {string} site
 * @returns {string}
 */
export function computeSiteKey(org, site) {
  return `main--${site}--${org}`;
}

/**
 * Compute the surrogate key for a 404.
 * @param {string} org
 * @param {string} site
 * @returns {string}
 */
export function compute404Key(org, site) {
  return `main--${site}--${org}_404`;
}

/**
 * Compute the surrogate key for catalog price rules.
 * Applied to index and sitemap responses so they can all be invalidated together
 * when price rules change.
 * @param {string} org
 * @param {string} site
 * @returns {string}
 */
export function computePriceRulesKey(org, site) {
  return `main--${site}--${org}_pricerules`;
}

/**
 * Compute the keys attached to a cached product response.
 * Includes site and dependency keys. Use computePurgeKeys for product changes.
 * @param {string} org - The organization identifier
 * @param {string} site - The site identifier
 * @param {string} path - The product path (e.g., /products/blender-pro-500)
 * @param {string} [contentBusId] - Optional content bus ID for authored content key
 * @returns {Promise<string[]>}
 */
export async function computeProductResponseKeys(org, site, path, contentBusId) {
  const keys = [
    await computeProductPathKey(org, site, path),
    computeSiteKey(org, site),
  ];

  if (contentBusId) {
    keys.push(await computeAuthoredContentKey(contentBusId, path));
    keys.push(`${contentBusId}_metadata`);
    keys.push(`main--${site}--${org}_head`);
    keys.push(contentBusId);
  }

  return keys;
}

/**
 * Compute the keys attached to a cached index.json response.
 * Includes the site key. Use computePurgeKeys for index changes.
 * @param {string} org - The organization identifier
 * @param {string} site - The site identifier
 * @param {string} path - The index path (e.g., /us/en/products/index.json)
 * @returns {Promise<string[]>}
 */
export async function computeIndexResponseKeys(org, site, path) {
  return [
    await computeProductPathKey(org, site, path),
    computeSiteKey(org, site),
  ];
}

/**
 * Compute the keys attached to a cached sitemap.xml response.
 * Includes the site key. Use computePurgeKeys for sitemap changes.
 * @param {string} org - The organization identifier
 * @param {string} site - The site identifier
 * @param {string} path - The sitemap path (e.g., /us/en/sitemap.xml)
 * @returns {Promise<string[]>}
 */
export async function computeSitemapResponseKeys(org, site, path) {
  return [
    await computeProductPathKey(org, site, path),
    computeSiteKey(org, site),
  ];
}

/**
 * Compute the keys attached to a cached media response.
 * Includes site and media group keys. Not a resource-specific purge list.
 * @param {string} org
 * @param {string} site
 * @param {string} path
 * @returns {Promise<string[]>}
 */
export async function computeMediaResponseKeys(org, site, path) {
  const keys = [];

  const siteKey = computeSiteKey(org, site);
  const file = path.split('/').pop().split('.')[0];
  const hash = file.split('_')[1];
  keys.push(siteKey);
  keys.push(`${siteKey}_media`);
  keys.push(`${siteKey}/${hash}`);

  return keys;
}

/** @deprecated Use computeProductResponseKeys for response tagging. */
export const computeProductKeys = computeProductResponseKeys;

/** @deprecated Use computeIndexResponseKeys for response tagging. */
export const computeIndexKeys = computeIndexResponseKeys;

/** @deprecated Use computeSitemapResponseKeys for response tagging. */
export const computeSitemapKeys = computeSitemapResponseKeys;

/** @deprecated Use computeMediaResponseKeys for response tagging. */
export const computeMediaKeys = computeMediaResponseKeys;

/**
 * Compute purge keys for product, index.json, sitemap.xml, or /_pricerules paths.
 * Never includes the site key. Other resources, including media, are unsupported.
 * Unrecognized paths are treated as product paths, not rejected.
 * @param {string} org
 * @param {string} site
 * @param {string} path - A supported resource path; input is not validated
 * @param {{ contentBusId?: string }} [options]
 * @returns {Promise<string[]>}
 */
export async function computePurgeKeys(org, site, path, { contentBusId } = {}) {
  if (path === '/_pricerules') {
    return [computePriceRulesKey(org, site)];
  }
  if (path.endsWith('/index.json') || path.endsWith('/sitemap.xml')) {
    return [await computeProductPathKey(org, site, path)];
  }
  const keys = getProductPathVariants(path)
    .map((variant) => computeProductPathKey(org, site, variant));
  if (contentBusId) {
    keys.push(computeAuthoredContentKey(contentBusId, path));
  }
  return Promise.all(keys);
}
