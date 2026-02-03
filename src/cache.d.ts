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
 * Compute the surrogate keys for a successful product request.
 * This is a convenience function that returns all keys needed for cache invalidation.
 * @param org - The organization identifier
 * @param site - The site identifier
 * @param path - The product path (e.g., /products/blender-pro-500)
 * @param contentBusId - Optional content bus ID for authored content keys
 * @returns A promise that resolves to an array of computed surrogate keys
 */
export function computeProductKeys(
  org: string,
  site: string,
  path: string,
  contentBusId?: string
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
