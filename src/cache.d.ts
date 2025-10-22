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
 * Compute the surrogate key for a store view.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param storeCode - The store code
 * @param storeViewCode - The store view code
 * @returns A promise that resolves to the computed surrogate key
 */
export function computeStoreViewKey(
  org: string,
  site: string,
  storeCode: string,
  storeViewCode: string
): Promise<string>;

/**
 * Compute the surrogate key for a store.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param storeCode - The store code
 * @returns A promise that resolves to the computed surrogate key
 */
export function computeStoreKey(
  org: string,
  site: string,
  storeCode: string
): Promise<string>;

/**
 * Compute the surrogate key for a product sku.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param storeCode - The store code
 * @param storeViewCode - The store view code
 * @param sku - The product SKU
 * @returns A promise that resolves to the computed surrogate key
 */
export function computeProductSkuKey(
  org: string,
  site: string,
  storeCode: string,
  storeViewCode: string,
  sku: string
): Promise<string>;

/**
 * Compute the surrogate key for a product url key.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param storeCode - The store code
 * @param storeViewCode - The store view code
 * @param urlKey - The product URL key
 * @returns A promise that resolves to the computed surrogate key
 */
export function computeProductUrlKeyKey(
  org: string,
  site: string,
  storeCode: string,
  storeViewCode: string,
  urlKey: string
): Promise<string>;

/**
 * Compute the surrogate key for a site.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @returns A promise that resolves to the computed surrogate key
 */
export function computeSiteKey(
  org: string,
  site: string
): string;

/**
 * Compute the surrogate key for a 404.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @returns A promise that resolves to the computed surrogate key
 */
export function compute404Key(
  org: string,
  site: string
): string;

/**
 * Compute the surrogate keys for a product.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param storeCode - The store code
 * @param storeViewCode - The store view code
 * @param sku - The product SKU
 * @param urlKey - The product URL key
 * @returns A promise that resolves to an array of computed surrogate keys
 */
export function computeProductKeys(
  org: string,
  site: string,
  storeCode: string,
  storeViewCode: string,
  sku: string,
  urlKey: string
): Promise<string[]>;

/**
 * Compute the surrogate keys for a media resource.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param path - The path of the media resource
 * @returns A promise that resolves to an array of computed surrogate keys
 */
export function computeMediaKeys(
  org: string,
  site: string,
  path: string
): Promise<string[]>;