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
 * Compute the surrogate key for a store view.
 * @param {string} org
 * @param {string} site
 * @param {string} storeCode
 * @param {string} storeViewCode
 * @returns
 */
export async function computeStoreViewKey(org, site, storeCode, storeViewCode) {
  return computeSurrogateKey(`/${org}/${site}/${storeCode}/${storeViewCode}`);
}

/**
 * Compute the surrogate key for a store.
 * @param {string} org
 * @param {string} site
 * @param {string} storeCode
 * @returns
 */
export async function computeStoreKey(org, site, storeCode) {
  return computeSurrogateKey(`/${org}/${site}/${storeCode}`);
}

/**
 * Compute the surrogate key for a product sku.
 * @param {string} org
 * @param {string} site
 * @param {string} storeCode
 * @param {string} storeViewCode
 * @param {string} sku
 * @returns
 */
export async function computeProductSkuKey(org, site, storeCode, storeViewCode, sku) {
  return computeSurrogateKey(`/${org}/${site}/${storeCode}/${storeViewCode}/${sku}`);
}

/**
 * Compute the surrogate key for a product url key.
 * @param {string} org
 * @param {string} site
 * @param {string} storeCode
 * @param {string} storeViewCode
 * @param {string} urlKey
 * @returns
 */
export async function computeProductUrlKeyKey(org, site, storeCode, storeViewCode, urlKey) {
  return computeSurrogateKey(`/${org}/${site}/${storeCode}/${storeViewCode}/${urlKey}`);
}

/**
 * Compute the surrogate key for a site.
 * @param {string} org
 * @param {string} site
 * @returns
 */
export async function computeSiteKey(org, site) {
  return computeSurrogateKey(`main--${site}--${org}`);
}

/**
 * Compute the surrogate keys for a product.
 * @param {string} sku
 * @param {string} urlKey
 * @param {string} storeCode
 * @param {string} storeViewCode
 * @returns
 */
export async function computeProductKeys(org, site, storeCode, storeViewCode, sku, urlKey) {
  const keys = [];

  keys.push(await computeStoreViewKey(org, site, storeCode, storeViewCode));
  keys.push(await computeStoreKey(org, site, storeCode));
  keys.push(await computeProductSkuKey(org, site, storeCode, storeViewCode, sku));
  keys.push(await computeProductUrlKeyKey(org, site, storeCode, storeViewCode, urlKey));
  keys.push(await computeSiteKey(`main--${site}--${org}`));

  return keys;
}
