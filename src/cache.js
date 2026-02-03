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
 * Compute the surrogate keys for a successful product request.
 * This is a convenience function that returns all keys needed for cache invalidation.
 * @param {string} org - The organization identifier
 * @param {string} site - The site identifier
 * @param {string} path - The product path (e.g., /products/blender-pro-500)
 * @param {string} [contentBusId] - Optional content bus ID for authored content key
 * @returns {Promise<string[]>}
 */
export async function computeProductKeys(org, site, path, contentBusId) {
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
 * Compute the surrogate keys for a media resource.
 * @param {string} org
 * @param {string} site
 * @param {string} path
 * @returns {Promise<string[]>}
 */
export async function computeMediaKeys(org, site, path) {
  const keys = [];

  const siteKey = computeSiteKey(org, site);
  const file = path.split('/').pop().split('.')[0];
  const hash = file.split('_')[1];
  keys.push(siteKey);
  keys.push(`${siteKey}_media`);
  keys.push(`${siteKey}/${hash}`);

  return keys;
}
