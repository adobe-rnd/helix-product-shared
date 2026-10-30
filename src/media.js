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

import { StorageClient } from './StorageClient.js';

/**
 * User agent for origin image fetches, shared with helix-product-image-collector so a
 * single allowlist entry covers both. Workers `fetch()` sends none by default, which
 * some CDN bot rules reject outright.
 */
export const IMAGE_FETCH_USER_AGENT = 'helix-product-image-collector (+https://www.aem.live)';

/**
 * Origin statuses worth retrying later. This module fetches inside an API request, so it
 * doesn't retry them itself: waiting seconds won't lift a CDN block or rate limit, and
 * would hold the request open. Callers get them back as failures (see
 * `extractAndReplaceImages`) and can hand them to the image collector, which retries with
 * queue-level backoff.
 */
const RETRYABLE_STATUS_CODES = new Set([403, 408, 425, 429, 500, 502, 503, 504]);

/**
 * @param {string} pathOrUrl
 * @returns {boolean}
 */
export function isRelativePath(pathOrUrl) {
  if (typeof pathOrUrl !== 'string') {
    return false;
  }
  return (pathOrUrl.startsWith('/') || pathOrUrl.startsWith('./')) && !pathOrUrl.includes('..') && !pathOrUrl.includes(' ');
}

/**
 * check if url is invalid, ie. not parseable as a URL
 * @param {string} url
 * @returns {boolean}
 */
function isInvalidURL(url) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return false;
  } catch {
    return true;
  }
}

/**
 * check if url is either a relative path or a valid URL
 * @param {string} url
 * @returns {boolean}
 */
export function isValidURL(url) {
  return typeof url === 'string' && !!url.trim() && (!isRelativePath(url) || isInvalidURL(url));
}

/**
 * Apply image lookup to a product, replacing external URLs with hashed URLs
 * @param {SharedTypes.ProductBusEntry | SharedTypes.ProductBusEntryInternal} product
 * @returns {SharedTypes.ProductBusEntry} - Mutated product
 */
export function applyImageLookup(product) {
  if (!product.internal?.images) {
    return product;
  }

  const { images: imageLookup } = product.internal;
  if (product.metaImage && imageLookup[product.metaImage]) {
    product.metaImage = imageLookup[product.metaImage].sourceUrl;
  }

  const images = [
    ...(product.images ?? []),
    ...(product.variants ?? []).flatMap((v) => v.images ?? []),
  ];

  for (const image of images) {
    const imageData = imageLookup[image.url];
    if (imageData) {
      image.url = imageData.sourceUrl;
    }
  }

  return product;
}

/**
 * Check if product has new images not in the internal images lookup
 * @param {SharedTypes.ProductBusEntry | SharedTypes.ProductBusEntryInternal} product
 * @returns {boolean}
 */
export function hasNewImages(product) {
  const imageLookup = product.internal?.images || {};
  if (product.metaImage
    && !isRelativePath(product.metaImage)
    && !imageLookup[product.metaImage]) {
    return true;
  }

  const images = [
    ...(product.images ?? []),
    ...(product.variants ?? []).flatMap((v) => v.images ?? []),
  ];

  for (const image of images) {
    const { url } = image;
    // If it's an external URL (not relative) and not in lookup, it's new
    if (!isRelativePath(url) && !imageLookup[url]) {
      return true;
    }
  }

  return false;
}

const MIME_TO_EXT = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/webp': 'webp',
};

/**
 * @param {string|null} mimeType
 * @returns {string|undefined}
 */
export function extensionFromMimeType(mimeType) {
  if (!mimeType) {
    return undefined;
  }
  const base = mimeType.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[base];
}

/**
 * @param {string} url
 * @returns {string|undefined}
 */
export const extractExtension = (url) => {
  try {
    const { pathname } = new URL(url);
    const lastSegment = pathname.split('/').pop() || '';
    const match = lastSegment.match(/\.([^.]+)$/);
    return match?.[1]
      ? match[1].split('?')[0].split('#')[0]
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Append a filename to a media URL.
 * @param {string} url
 * @param {string|undefined} filename
 * @returns {string}
 */
export function appendFilenameToMediaUrl(url, filename) {
  if (!url || !filename) {
    return url;
  }

  // Defense-in-depth: reject filenames with unsafe characters
  if (!/^[A-Za-z0-9_-]+$/.test(filename)) {
    return url;
  }

  const mediaMatch = url.match(/^(\.?\/media_[0-9a-f]{40,})(\.[0-9a-z]+)([?#].*)?$/i);
  if (!mediaMatch) {
    return url;
  }

  const [, mediaPath, extension, suffix = ''] = mediaMatch;
  return `${mediaPath}/${filename}${extension}${suffix}`;
}

/**
 * Fetch an image from its origin, once.
 * @param {Context} ctx
 * @param {string} imageUrl
 * @returns {Promise<SharedTypes.MediaData>}
 * @throws {Error & { url: string, status: number, retryable: boolean }} on a non-2xx response
 */
async function fetchImage(ctx, imageUrl) {
  const { log } = ctx;

  log.debug('fetching image from origin: ', imageUrl);
  const resp = await fetch(imageUrl, {
    method: 'GET',
    headers: {
      'user-agent': IMAGE_FETCH_USER_AGENT,
      'accept-encoding': 'identity',
      accept: 'image/jpeg,image/jpg,image/png,image/gif,video/mp4,application/xml,image/x-icon,image/avif,image/webp,*/*;q=0.8',
    },
  });
  if (!resp.ok) {
    /** @type {Error & { url?: string, status?: number, retryable?: boolean }} */
    const error = new Error(`Failed to fetch image: ${imageUrl} (${resp.status})`);
    error.url = imageUrl;
    error.status = resp.status;
    error.retryable = RETRYABLE_STATUS_CODES.has(resp.status);
    throw error;
  }

  const data = await resp.arrayBuffer();
  const arr = await crypto.subtle.digest('SHA-1', data);
  const hash = Array.from(new Uint8Array(arr))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  const contentType = resp.headers.get('content-type');

  return {
    data,
    sourceUrl: imageUrl,
    hash,
    mimeType: contentType,
    length: data.byteLength,
    extension: extractExtension(imageUrl) || extensionFromMimeType(contentType),
  };
}

/**
 * Collect a product's external images into media storage and replace their URLs.
 * Each image is fetched at most once per call. Images that fail keep their absolute
 * URL; when `options.failures` is given, each failure is appended to it so the caller
 * can retry them later (e.g. via the image collector).
 *
 * @param {Context} ctx
 * @param {string} org
 * @param {string} site
 * @param {SharedTypes.ProductBusEntry | SharedTypes.ProductBusEntryInternal} product
 * @param {{ failures?: SharedTypes.ImageFetchFailure[] }} [options]
 * @returns {Promise<SharedTypes.ProductBusEntryInternal>}
 */
export async function extractAndReplaceImages(ctx, org, site, product, options = {}) {
  const { log } = ctx;
  const storageClient = StorageClient.fromContext(ctx);
  /** @type {Map<string, Promise<string>>} */
  const processed = new Map();

  // Get existing image lookup from internal property
  const existingImages = product.internal?.images || {};

  /**
   * @param {string} url
   * @returns {Promise<string|undefined>} new url
   */
  const processImage = async (url) => {
    if (isInvalidURL(url)) {
      return null;
    }
    if (isRelativePath(url)) {
      log.debug(`image already relative: ${url}`);
      return url;
    }
    if (processed.has(url)) {
      log.debug(`image already being processed: ${url}`);
      return processed.get(url);
    }

    /** @type {(value: string) => void} */
    let resolve;
    const promise = new Promise((r) => {
      resolve = r;
    });
    processed.set(url, promise);

    // Every path below settles `promise` (via resolve) so that a later call for the same
    // URL, awaiting `processed.get(url)`, can't hang, and every failure, including a
    // storage error from the lookup, is logged and reported the same way.
    try {
      // Check existing internal images first
      if (existingImages[url]) {
        const { sourceUrl } = existingImages[url];
        log.debug(`image found in internal: ${url} -> ${sourceUrl}`);
        resolve(sourceUrl);
        return sourceUrl;
      }

      // avoid fetching the image if possible
      // assumes that the source image never changes
      const imageLocation = await storageClient.lookupImageLocation(ctx, org, site, url);
      if (imageLocation) {
        if (!product.internal) {
          product.internal = { images: {} };
        }
        product.internal.images[url] = { sourceUrl: imageLocation };
        resolve(imageLocation);
        return imageLocation;
      }

      const img = await fetchImage(ctx, url);
      // only set the image if the fetch succeeded
      let newUrl;
      if (img) {
        newUrl = await storageClient.saveImage(ctx, org, site, img);
        await storageClient.saveImageLocation(ctx, org, site, url, newUrl);

        // Store in internal property
        if (!product.internal) {
          product.internal = { images: {} };
        }
        product.internal.images[url] = {
          sourceUrl: newUrl,
          size: img.length,
          mimeType: img.mimeType,
        };
      }
      resolve(newUrl);
      return newUrl;
    } catch (e) {
      // Log the reason as plain fields: an Error argument is rendered as its stack only
      // in Workers Observability, which hides the URL and the origin status.
      const failure = {
        url,
        status: e?.status,
        retryable: e?.retryable ?? true,
      };
      log.error(`error processing image: ${e?.message ?? e}`, failure);
      options.failures?.push(failure);
      // resolve with null to allow simultaneous requests for the same image to continue
      resolve(null);
      throw e;
    }
  };

  const images = [
    ...(product.images ?? []),
    ...(product.variants ?? []).flatMap((v) => v.images ?? []),
  ];

  // process images sequentially, backoff when encountering errors
  for (const image of images) {
    try {
    // eslint-disable-next-line no-await-in-loop
      const newUrl = await processImage(image.url);
      // only set the image if the fetch succeeded
      if (newUrl) {
        image.url = newUrl;
      }
    } catch {
      // already logged and reported by processImage
    }
  }

  if (product.metaImage) {
    try {
      const newUrl = await processImage(product.metaImage);
      // only set the image if the fetch succeeded
      if (newUrl) {
        product.metaImage = newUrl;
      }
    } catch {
      // already logged and reported by processImage
    }
  }
  return product;
}
