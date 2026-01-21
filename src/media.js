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
import { errorWithResponse } from './error.js';

const RETRY_CODES = [429, 403];

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
 * @param {string} url
 * @returns {string|undefined}
 */
const extractExtension = (url) => {
  const match = url.match(/\.([^.]+)$/);
  return match?.[1]
    ? match[1].split('?')[0].split('#')[0]
    : undefined;
};

/**
 * @param {Context} pctx
 * @param {string} pimageUrl
 * @returns {Promise<SharedTypes.MediaData | null>}
 */
async function fetchImage(pctx, pimageUrl) {
  /**
   * @param {Context} ctx
   * @param {string} imageUrl
   * @param {number} attempts
   * @returns {Promise<SharedTypes.MediaData | null>}
   */
  async function doFetch(ctx, imageUrl, attempts = 0) {
    const { log } = ctx;

    log.debug('fetching image from origin: ', imageUrl);
    const resp = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'accept-encoding': 'identity',
        accept: 'image/jpeg,image/jpg,image/png,image/gif,video/mp4,application/xml,image/x-icon,image/avif,image/webp,*/*;q=0.8',
      },
    });
    if (!resp.ok) {
      if (RETRY_CODES.includes(resp.status)) {
        if (attempts < 3) {
          // eslint-disable-next-line no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempts));
          return doFetch(ctx, imageUrl, attempts + 1);
        }
      }
      throw errorWithResponse(502, `Failed to fetch image: ${imageUrl} (${resp.status})`);
    }

    const data = await resp.arrayBuffer();
    const arr = await crypto.subtle.digest('SHA-1', data);
    const hash = Array.from(new Uint8Array(arr))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    return {
      data,
      sourceUrl: imageUrl,
      hash,
      mimeType: resp.headers.get('content-type'),
      length: data.byteLength,
      extension: extractExtension(imageUrl),
    };
  }

  return doFetch(pctx, pimageUrl);
}

/**
 * @param {Context} ctx
 * @param {string} org
 * @param {string} site
 * @param {SharedTypes.ProductBusEntry} product
 * @returns {Promise<SharedTypes.ProductBusEntry>}
 */
export async function extractAndReplaceImages(ctx, org, site, product) {
  const { log } = ctx;
  const storageClient = StorageClient.fromContext(ctx);
  /** @type {Map<string, Promise<string>>} */
  const processed = new Map();

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

    // avoid fetching the image if possible
    // assumes that the source image never changes
    const imageLocation = await storageClient.lookupImageLocation(ctx, org, site, url);
    if (imageLocation) {
      // store for next time to avoid the HEAD
      resolve(imageLocation);
      return imageLocation;
    }

    const img = await fetchImage(ctx, url);
    // only set the image if the fetch succeeded
    let newUrl;
    if (img) {
      newUrl = await storageClient.saveImage(ctx, org, site, img);
      if (newUrl) {
        await storageClient.saveImageLocation(ctx, org, site, url, newUrl);
      }
    }
    resolve(newUrl);
    return newUrl;
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
    } catch (e) {
      log.error('error processing image: ', e);
      // TODO: requeue the product to reprocess image
    }
  }
  return product;
}
