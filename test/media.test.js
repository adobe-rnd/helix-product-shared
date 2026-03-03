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

import assert from 'node:assert';
import {
  extractAndReplaceImages,
  extractExtension,
  extensionFromMimeType,
  applyImageLookup,
  hasNewImages,
  appendFilenameToMediaUrl,
} from '../src/media.js';
import { StorageClient } from '../src/StorageClient.js';
import { TEST_CONTEXT } from './util.js';

describe('media', () => {
  let originalFetch;
  let originalDigest;
  let originalFromContext;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalDigest = crypto.subtle.digest;
    originalFromContext = StorageClient.fromContext;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    crypto.subtle.digest = originalDigest;
    StorageClient.fromContext = originalFromContext;
  });

  describe('extractAndReplaceImages()', async () => {
    it('should replace image URLs with relative paths', async () => {
      const ctx = TEST_CONTEXT();
      const calls = {
        lookupImageLocation: [],
        saveImage: [],
        fetch: [],
        saveImageLocation: [],
      };

      const mockStorageClient = {
        imageLocations: {},
        async lookupImageLocation(...args) {
          calls.lookupImageLocation.push(args);
          return this.imageLocations[args[3]] || null;
        },
        async saveImage(...args) {
          calls.saveImage.push(args);
          return './media_abc123.jpg';
        },
        async saveImageLocation(...args) {
          calls.saveImageLocation.push(args);
          // eslint-disable-next-line prefer-destructuring
          this.imageLocations[args[3]] = args[4];
        },
      };
      StorageClient.fromContext = () => mockStorageClient;

      // Mock crypto.subtle.digest
      const mockHash = new Uint8Array([0xab, 0xc1, 0x23]);
      crypto.subtle.digest = async () => mockHash.buffer;

      // Mock fetch
      const mockImageData = new ArrayBuffer(100);
      global.fetch = async (...args) => {
        calls.fetch.push(args);
        return {
          ok: true,
          arrayBuffer: async () => mockImageData,
          headers: {
            get: () => 'image/jpeg',
          },
        };
      };

      const product = {
        images: [
          { url: 'https://example.com/image.jpg' },
        ],
      };

      const result = await extractAndReplaceImages(ctx, 'org', 'site', product);

      assert.strictEqual(result.images[0].url, './media_abc123.jpg');
      assert.strictEqual(result.internal.images['https://example.com/image.jpg'].sourceUrl, './media_abc123.jpg');
      assert.strictEqual(result.internal.images['https://example.com/image.jpg'].size, 100);
      assert.strictEqual(result.internal.images['https://example.com/image.jpg'].mimeType, 'image/jpeg');
      assert.strictEqual(calls.lookupImageLocation.length, 1);
      assert.strictEqual(calls.saveImage.length, 1);
      assert.strictEqual(calls.fetch.length, 1);
      assert.deepStrictEqual(calls.lookupImageLocation[0], [ctx, 'org', 'site', 'https://example.com/image.jpg']);
      assert.deepStrictEqual(calls.saveImage[0], [
        ctx,
        'org',
        'site',
        {
          data: mockImageData,
          sourceUrl: 'https://example.com/image.jpg',
          hash: 'abc123',
          mimeType: 'image/jpeg',
          length: 100,
          extension: 'jpg',
        },
      ]);
      assert.deepStrictEqual(calls.fetch[0], [
        'https://example.com/image.jpg',
        {
          method: 'GET',
          headers: {
            'accept-encoding': 'identity',
            accept: 'image/jpeg,image/jpg,image/png,image/gif,video/mp4,application/xml,image/x-icon,image/avif,image/webp,*/*;q=0.8',
          },
        },
      ]);

      // saveImageLocation should be called once to store the image location
      assert.strictEqual(calls.saveImageLocation.length, 1);
      assert.deepStrictEqual(calls.saveImageLocation[0], [
        ctx,
        'org',
        'site',
        'https://example.com/image.jpg',
        './media_abc123.jpg',
      ]);
    });

    it('should ignore invalid image URLs', async () => {
      const ctx = TEST_CONTEXT();
      const calls = {
        lookupImageLocation: [],
        saveImage: [],
        fetch: [],
      };

      const mockStorageClient = {
        lookupImageLocation: async (...args) => {
          calls.lookupImageLocation.push(args);
          return null;
        },
        saveImage: async (...args) => {
          // should not be called
          calls.saveImage.push(args);
          // return './media_abc123.jpg';
          return null;
        },
      };
      StorageClient.fromContext = () => mockStorageClient;

      // Mock crypto.subtle.digest
      const mockHash = new Uint8Array([0xab, 0xc1, 0x23]);
      crypto.subtle.digest = async () => mockHash.buffer;

      // Mock fetch
      const mockImageData = new ArrayBuffer(100);
      global.fetch = async (...args) => {
        calls.fetch.push(args);
        return {
          ok: true,
          arrayBuffer: async () => mockImageData,
          headers: {
            get: () => 'image/jpeg',
          },
        };
      };

      const product = {
        images: [
          { url: '' },
          { url: null },
          { url: undefined },
          { url: 0 },
          { url: false },
          { url: true },
          { url: NaN },
          { url: Infinity },
          { url: -Infinity },
          { url: [] },
          { url: 'not relative path or url' },
        ],
      };

      const result = await extractAndReplaceImages(ctx, 'org', 'site', product);

      assert.strictEqual(result.images[0].url, '');
      assert.strictEqual(result.images[1].url, null);
      assert.strictEqual(result.images[2].url, undefined);
      assert.strictEqual(result.images[3].url, 0);
      assert.strictEqual(result.images[4].url, false);
      assert.strictEqual(result.images[5].url, true);
      assert.strictEqual(result.images[6].url, NaN);
      assert.strictEqual(result.images[7].url, Infinity);
      assert.strictEqual(result.images[8].url, -Infinity);
      assert.deepStrictEqual(result.images[9].url, []);
      assert.deepStrictEqual(result.images[10].url, 'not relative path or url');

      assert.strictEqual(calls.lookupImageLocation.length, 0);
      assert.strictEqual(calls.saveImage.length, 0);
      assert.strictEqual(calls.fetch.length, 0);
    });

    it('should not include query params or hash in the extension stored in metadata', async () => {
      const ctx = TEST_CONTEXT();
      const calls = {
        lookupImageLocation: [],
        saveImage: [],
        fetch: [],
        saveImageLocation: [],
      };

      const mockStorageClient = {
        imageLocations: {},
        async lookupImageLocation(...args) {
          calls.lookupImageLocation.push(args);
          return this.imageLocations[args[3]] || null;
        },
        async saveImage(...args) {
          calls.saveImage.push(args);
          return './media_abc123.jpg';
        },
        async saveImageLocation(...args) {
          calls.saveImageLocation.push(args);
          // eslint-disable-next-line prefer-destructuring
          this.imageLocations[args[3]] = args[4];
        },
      };
      StorageClient.fromContext = () => mockStorageClient;

      // Mock crypto.subtle.digest
      const mockHash = new Uint8Array([0xab, 0xc1, 0x23]);
      crypto.subtle.digest = async () => mockHash.buffer;

      // Mock fetch
      const mockImageData = new ArrayBuffer(100);
      global.fetch = async (...args) => {
        calls.fetch.push(args);
        return {
          ok: true,
          arrayBuffer: async () => mockImageData,
          headers: {
            get: () => 'image/jpeg',
          },
        };
      };

      const product = {
        images: [
          { url: 'https://example.com/image.jpg?id=123' },
          { url: 'https://example.com/image.jpg#123' },
        ],
      };

      const result = await extractAndReplaceImages(ctx, 'org', 'site', product);

      assert.strictEqual(result.images[0].url, './media_abc123.jpg');
      assert.strictEqual(result.images[1].url, './media_abc123.jpg');
      assert.strictEqual(calls.lookupImageLocation.length, 2);
      assert.strictEqual(calls.saveImage.length, 2);
      assert.strictEqual(calls.fetch.length, 2); // still honor query params as distinct urls
      assert.deepStrictEqual(calls.lookupImageLocation[0], [ctx, 'org', 'site', 'https://example.com/image.jpg?id=123']);
      assert.deepStrictEqual(calls.lookupImageLocation[1], [ctx, 'org', 'site', 'https://example.com/image.jpg#123']);
      assert.deepStrictEqual(calls.saveImage[0], [
        ctx,
        'org',
        'site',
        {
          data: mockImageData,
          sourceUrl: 'https://example.com/image.jpg?id=123',
          hash: 'abc123',
          mimeType: 'image/jpeg',
          length: 100,
          extension: 'jpg',
        },
      ]);
      assert.deepStrictEqual(calls.saveImage[1], [
        ctx,
        'org',
        'site',
        {
          data: mockImageData,
          sourceUrl: 'https://example.com/image.jpg#123',
          hash: 'abc123',
          mimeType: 'image/jpeg',
          length: 100,
          extension: 'jpg',
        },
      ]);
      assert.deepStrictEqual(calls.fetch[0], [
        'https://example.com/image.jpg?id=123',
        {
          method: 'GET',
          headers: {
            'accept-encoding': 'identity',
            accept: 'image/jpeg,image/jpg,image/png,image/gif,video/mp4,application/xml,image/x-icon,image/avif,image/webp,*/*;q=0.8',
          },
        },
      ]);
      assert.deepStrictEqual(calls.fetch[1], [
        'https://example.com/image.jpg#123',
        {
          method: 'GET',
          headers: {
            'accept-encoding': 'identity',
            accept: 'image/jpeg,image/jpg,image/png,image/gif,video/mp4,application/xml,image/x-icon,image/avif,image/webp,*/*;q=0.8',
          },
        },
      ]);

      // saveImageLocation should be called once to store the image location
      assert.strictEqual(calls.saveImageLocation.length, 2);
      assert.deepStrictEqual(calls.saveImageLocation[0], [
        ctx,
        'org',
        'site',
        'https://example.com/image.jpg?id=123',
        './media_abc123.jpg',
      ]);
    });

    it('should reuse cache image location, if available', async () => {
      const ctx = TEST_CONTEXT();
      const calls = {
        lookupImageLocation: [],
        saveImage: [],
        fetch: [],
      };

      const mockStorageClient = {
        lookupImageLocation: async (...args) => {
          calls.lookupImageLocation.push(args);
          return './media_cached123.jpg';
        },
        saveImage: async (...args) => {
          calls.saveImage.push(args);
        },
      };
      StorageClient.fromContext = () => mockStorageClient;

      // Mock fetch - should not be called
      global.fetch = async (...args) => {
        calls.fetch.push(args);
      };

      const product = {
        images: [
          { url: 'https://example.com/image.jpg' },
        ],
      };

      const result = await extractAndReplaceImages(ctx, 'org', 'site', product);

      assert.strictEqual(result.images[0].url, './media_cached123.jpg');
      assert.strictEqual(calls.lookupImageLocation.length, 1);
      assert.strictEqual(calls.saveImage.length, 0);
      assert.strictEqual(calls.fetch.length, 0);
      assert.deepStrictEqual(calls.lookupImageLocation[0], [ctx, 'org', 'site', 'https://example.com/image.jpg']);
    });

    it('should not process already processed images', async () => {
      const ctx = TEST_CONTEXT();
      const calls = {
        lookupImageLocation: [],
        saveImage: [],
        saveImageLocation: [],
        fetch: [],
      };

      const mockStorageClient = {
        imageLocations: {},
        async lookupImageLocation(...args) {
          calls.lookupImageLocation.push(args);
          return this.imageLocations[args[3]] || null;
        },
        async saveImage(...args) {
          calls.saveImage.push(args);
          return './media_def456.jpg';
        },
        async saveImageLocation(...args) {
          calls.saveImageLocation.push(args);
          // eslint-disable-next-line prefer-destructuring
          this.imageLocations[args[3]] = args[4];
        },
      };
      StorageClient.fromContext = () => mockStorageClient;

      // Mock crypto.subtle.digest
      const mockHash = new Uint8Array([0xde, 0xf4, 0x56]);
      crypto.subtle.digest = async () => mockHash.buffer;

      // Mock fetch
      const mockImageData = new ArrayBuffer(100);
      global.fetch = async (...args) => {
        calls.fetch.push(args);
        return {
          ok: true,
          arrayBuffer: async () => mockImageData,
          headers: {
            get: () => 'image/jpeg',
          },
        };
      };

      const product = {
        images: [
          { url: 'https://example.com/same-image.jpg' },
          { url: 'https://example.com/same-image.jpg' },
          { url: './relative-image.jpg' }, // relative path is treated as already processed & replaced
        ],
        variants: [
          {
            images: [
              { url: 'https://example.com/same-image.jpg' },
            ],
          },
        ],
      };

      const result = await extractAndReplaceImages(ctx, 'org', 'site', product);

      // All three images should have the same URL
      assert.strictEqual(result.images[0].url, './media_def456.jpg');
      assert.strictEqual(result.images[1].url, './media_def456.jpg');
      assert.strictEqual(result.images[2].url, './relative-image.jpg');
      assert.strictEqual(result.variants[0].images[0].url, './media_def456.jpg');

      // fetch should only be called once despite having 3 references to the same image
      assert.strictEqual(calls.fetch.length, 1);
      assert.strictEqual(calls.saveImage.length, 1);
      assert.strictEqual(calls.lookupImageLocation.length, 1);
      assert.deepStrictEqual(calls.lookupImageLocation[0], [ctx, 'org', 'site', 'https://example.com/same-image.jpg']);
      assert.deepStrictEqual(calls.saveImage[0], [
        ctx,
        'org',
        'site',
        {
          data: mockImageData,
          sourceUrl: 'https://example.com/same-image.jpg',
          hash: 'def456',
          mimeType: 'image/jpeg',
          length: 100,
          extension: 'jpg',
        },
      ]);
      assert.deepStrictEqual(calls.fetch[0], [
        'https://example.com/same-image.jpg',
        {
          method: 'GET',
          headers: {
            'accept-encoding': 'identity',
            accept: 'image/jpeg,image/jpg,image/png,image/gif,video/mp4,application/xml,image/x-icon,image/avif,image/webp,*/*;q=0.8',
          },
        },
      ]);

      // saveImageLocation should be called once to store the image location
      assert.strictEqual(calls.saveImageLocation.length, 1);
      assert.deepStrictEqual(calls.saveImageLocation[0], [
        ctx,
        'org',
        'site',
        'https://example.com/same-image.jpg',
        './media_def456.jpg',
      ]);
    });

    it('should treat different query params as different images', async () => {
      const ctx = TEST_CONTEXT();
      const calls = {
        lookupImageLocation: [],
        saveImage: [],
        saveImageLocation: [],
        fetch: [],
      };

      const mockStorageClient = {
        imageLocations: {},
        async lookupImageLocation(...args) {
          calls.lookupImageLocation.push(args);
          return this.imageLocations[args[3]] || null;
        },
        async saveImage(...args) {
          calls.saveImage.push(args);
          return './media_def456.jpg';
        },
        async saveImageLocation(...args) {
          calls.saveImageLocation.push(args);
          // eslint-disable-next-line prefer-destructuring
          this.imageLocations[args[3]] = args[4];
        },
      };
      StorageClient.fromContext = () => mockStorageClient;

      // Mock crypto.subtle.digest
      const mockHash = new Uint8Array([0xde, 0xf4, 0x56]);
      crypto.subtle.digest = async () => mockHash.buffer;

      // Mock fetch
      const mockImageData = new ArrayBuffer(100);
      global.fetch = async (...args) => {
        calls.fetch.push(args);
        return {
          ok: true,
          arrayBuffer: async () => mockImageData,
          headers: {
            get: () => 'image/jpeg',
          },
        };
      };

      const product = {
        images: [
          { url: 'https://example.com/same-image.jpg' },
          { url: 'https://example.com/same-image.jpg?different=param' },
        ],
        variants: [
          {
            images: [
              { url: 'https://example.com/same-image.jpg' },
            ],
          },
        ],
      };

      const result = await extractAndReplaceImages(ctx, 'org', 'site', product);

      // All three images should have the same URL
      assert.strictEqual(result.images[0].url, './media_def456.jpg');
      assert.strictEqual(result.images[1].url, './media_def456.jpg');
      assert.strictEqual(result.variants[0].images[0].url, './media_def456.jpg');

      // fetch should only be called once despite having 3 references to the same image
      assert.strictEqual(calls.fetch.length, 2);
      assert.strictEqual(calls.saveImage.length, 2);
      assert.strictEqual(calls.lookupImageLocation.length, 2);
      assert.deepStrictEqual(calls.lookupImageLocation[0], [ctx, 'org', 'site', 'https://example.com/same-image.jpg']);
      assert.deepStrictEqual(calls.lookupImageLocation[1], [ctx, 'org', 'site', 'https://example.com/same-image.jpg?different=param']);
      assert.deepStrictEqual(calls.saveImage[0], [
        ctx,
        'org',
        'site',
        {
          data: mockImageData,
          sourceUrl: 'https://example.com/same-image.jpg',
          hash: 'def456',
          mimeType: 'image/jpeg',
          length: 100,
          extension: 'jpg',
        },
      ]);
      assert.deepStrictEqual(calls.saveImage[1], [
        ctx,
        'org',
        'site',
        {
          data: mockImageData,
          sourceUrl: 'https://example.com/same-image.jpg?different=param',
          hash: 'def456',
          mimeType: 'image/jpeg',
          length: 100,
          extension: 'jpg',
        },
      ]);

      assert.deepStrictEqual(calls.fetch[0], [
        'https://example.com/same-image.jpg',
        {
          method: 'GET',
          headers: {
            'accept-encoding': 'identity',
            accept: 'image/jpeg,image/jpg,image/png,image/gif,video/mp4,application/xml,image/x-icon,image/avif,image/webp,*/*;q=0.8',
          },
        },
      ]);
      assert.deepStrictEqual(calls.fetch[1], [
        'https://example.com/same-image.jpg?different=param',
        {
          method: 'GET',
          headers: {
            'accept-encoding': 'identity',
            accept: 'image/jpeg,image/jpg,image/png,image/gif,video/mp4,application/xml,image/x-icon,image/avif,image/webp,*/*;q=0.8',
          },
        },
      ]);

      // saveImageLocation should be called twice to store the image locations
      assert.strictEqual(calls.saveImageLocation.length, 2);
      assert.deepStrictEqual(calls.saveImageLocation[0], [
        ctx,
        'org',
        'site',
        'https://example.com/same-image.jpg',
        './media_def456.jpg',
      ]);
      assert.deepStrictEqual(calls.saveImageLocation[1], [
        ctx,
        'org',
        'site',
        'https://example.com/same-image.jpg?different=param',
        './media_def456.jpg',
      ]);
    });

    it('should derive extension from Content-Type for extensionless URLs', async () => {
      const ctx = TEST_CONTEXT();
      const calls = {
        lookupImageLocation: [],
        saveImage: [],
        fetch: [],
        saveImageLocation: [],
      };

      const mockStorageClient = {
        imageLocations: {},
        async lookupImageLocation(...args) {
          calls.lookupImageLocation.push(args);
          return this.imageLocations[args[3]] || null;
        },
        async saveImage(...args) {
          calls.saveImage.push(args);
          return './media_abc123.jpeg';
        },
        async saveImageLocation(...args) {
          calls.saveImageLocation.push(args);
          // eslint-disable-next-line prefer-destructuring
          this.imageLocations[args[3]] = args[4];
        },
      };
      StorageClient.fromContext = () => mockStorageClient;

      const mockHash = new Uint8Array([0xab, 0xc1, 0x23]);
      crypto.subtle.digest = async () => mockHash.buffer;

      const mockImageData = new ArrayBuffer(100);
      global.fetch = async (...args) => {
        calls.fetch.push(args);
        return {
          ok: true,
          arrayBuffer: async () => mockImageData,
          headers: {
            get: () => 'image/jpeg',
          },
        };
      };

      const product = {
        images: [
          { url: 'https://s7d9.scene7.com/is/image/danaherstage/product-image1' },
        ],
      };

      const result = await extractAndReplaceImages(ctx, 'org', 'site', product);

      assert.strictEqual(result.images[0].url, './media_abc123.jpeg');
      assert.strictEqual(calls.saveImage.length, 1);
      // The image passed to saveImage should have extension derived from mimeType
      const savedImage = calls.saveImage[0][3];
      assert.strictEqual(savedImage.extension, 'jpeg');
      assert.strictEqual(savedImage.mimeType, 'image/jpeg');
    });

    it('should retry on error', async () => {
      const ctx = TEST_CONTEXT();
      const calls = {
        lookupImageLocation: [],
        saveImage: [],
        fetch: [],
        saveImageLocation: [],
      };

      const mockStorageClient = {
        imageLocations: {},
        async lookupImageLocation(...args) {
          calls.lookupImageLocation.push(args);
          return this.imageLocations[args[3]] || null;
        },
        async saveImage(...args) {
          calls.saveImage.push(args);
          return './media_123456.jpg';
        },
        async saveImageLocation(...args) {
          calls.saveImageLocation.push(args);
          // eslint-disable-next-line prefer-destructuring
          this.imageLocations[args[3]] = args[4];
        },
      };
      StorageClient.fromContext = () => mockStorageClient;

      // Mock crypto.subtle.digest
      const mockHash = new Uint8Array([0x12, 0x34, 0x56]);
      crypto.subtle.digest = async () => mockHash.buffer;

      // Mock fetch to fail twice with 429, then succeed
      const mockImageData = new ArrayBuffer(100);
      global.fetch = async (...args) => {
        calls.fetch.push(args);
        const currentCall = calls.fetch.length;
        if (currentCall < 2) {
          return { ok: false, status: 429 };
        }
        return {
          ok: true,
          arrayBuffer: async () => mockImageData,
          headers: {
            get: () => 'image/jpeg',
          },
        };
      };

      const product = {
        images: [
          { url: 'https://example.com/image.jpg' },
        ],
      };

      const result = await extractAndReplaceImages(ctx, 'org', 'site', product);

      assert.strictEqual(result.images[0].url, './media_123456.jpg');
      assert.strictEqual(calls.fetch.length, 2);
      assert.strictEqual(calls.saveImage.length, 1);
      assert.strictEqual(calls.lookupImageLocation.length, 1);
      assert.deepStrictEqual(calls.lookupImageLocation[0], [ctx, 'org', 'site', 'https://example.com/image.jpg']);
      assert.deepStrictEqual(calls.saveImage[0], [
        ctx,
        'org',
        'site',
        {
          data: mockImageData,
          sourceUrl: 'https://example.com/image.jpg',
          hash: '123456',
          mimeType: 'image/jpeg',
          length: 100,
          extension: 'jpg',
        },
      ]);
      assert.deepStrictEqual(calls.fetch[0], [
        'https://example.com/image.jpg',
        {
          method: 'GET',
          headers: {
            'accept-encoding': 'identity',
            accept: 'image/jpeg,image/jpg,image/png,image/gif,video/mp4,application/xml,image/x-icon,image/avif,image/webp,*/*;q=0.8',
          },
        },
      ]);
      assert.deepStrictEqual(calls.fetch[1], [
        'https://example.com/image.jpg',
        {
          method: 'GET',
          headers: {
            'accept-encoding': 'identity',
            accept: 'image/jpeg,image/jpg,image/png,image/gif,video/mp4,application/xml,image/x-icon,image/avif,image/webp,*/*;q=0.8',
          },
        },
      ]);

      // saveImageLocation should be called once to store the image location
      assert.strictEqual(calls.saveImageLocation.length, 1);
      assert.deepStrictEqual(calls.saveImageLocation[0], [
        ctx,
        'org',
        'site',
        'https://example.com/image.jpg',
        './media_123456.jpg',
      ]);
    });

    it('should not process already relative image URLs', async () => {
      const ctx = TEST_CONTEXT();
      const calls = {
        lookupImageLocation: [],
        saveImage: [],
        fetch: [],
      };
      const mockStorageClient = {
        lookupImageLocation: async (...args) => {
          calls.lookupImageLocation.push(args);
          return null;
        },
        saveImage: async (...args) => {
          calls.saveImage.push(args);
        },
      };
      StorageClient.fromContext = () => mockStorageClient;

      // Mock fetch - should not be called
      global.fetch = async (...args) => {
        calls.fetch.push(args);
      };

      const product = {
        images: [
          { url: '/media/existing-image.jpg' },
          { url: './media/another-image.jpg' },
        ],
      };

      const result = await extractAndReplaceImages(ctx, 'org', 'site', product);

      assert.strictEqual(result.images[0].url, '/media/existing-image.jpg');
      assert.strictEqual(result.images[1].url, './media/another-image.jpg');
      assert.strictEqual(calls.lookupImageLocation.length, 0);
      assert.strictEqual(calls.saveImage.length, 0);
      assert.strictEqual(calls.fetch.length, 0);
    });

    it('should use existing imageLookup to avoid fetching images', async () => {
      const ctx = TEST_CONTEXT();
      const calls = {
        lookupImageLocation: [],
        saveImage: [],
        fetch: [],
        saveImageLocation: [],
      };

      const mockStorageClient = {
        imageLocations: {},
        async lookupImageLocation(...args) {
          calls.lookupImageLocation.push(args);
          return null; // Not in .lookup folder
        },
        async saveImage(...args) {
          calls.saveImage.push(args);
          return './media_new123.jpg';
        },
        async saveImageLocation(...args) {
          calls.saveImageLocation.push(args);
        },
      };
      StorageClient.fromContext = () => mockStorageClient;

      global.fetch = async (...args) => {
        calls.fetch.push(args);
        return {
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
          headers: {
            get: () => 'image/jpeg',
          },
        };
      };

      // Mock crypto.subtle.digest
      crypto.subtle.digest = async () => new Uint8Array([0x99, 0x88, 0x77]).buffer;

      const product = {
        images: [
          { url: 'https://example.com/image1.jpg' },
          { url: 'https://example.com/image2.jpg' },
        ],
        internal: {
          images: {
            'https://example.com/image1.jpg': {
              sourceUrl: './media_existing123.jpg',
              size: 100,
              mimeType: 'image/jpeg',
            },
          },
        },
      };

      const result = await extractAndReplaceImages(
        ctx,
        'org',
        'site',
        product,
      );

      // First image should use existing internal data, second should be fetched
      assert.strictEqual(result.images[0].url, './media_existing123.jpg');
      assert.strictEqual(result.images[1].url, './media_new123.jpg');

      // Check internal property was updated
      assert.strictEqual(result.internal.images['https://example.com/image1.jpg'].sourceUrl, './media_existing123.jpg');
      assert.strictEqual(result.internal.images['https://example.com/image2.jpg'].sourceUrl, './media_new123.jpg');
      assert.strictEqual(result.internal.images['https://example.com/image2.jpg'].size, 100);
      assert.strictEqual(result.internal.images['https://example.com/image2.jpg'].mimeType, 'image/jpeg');

      // Only second image should be looked up and fetched
      assert.strictEqual(calls.lookupImageLocation.length, 1);
      assert.strictEqual(calls.fetch.length, 1);
      assert.strictEqual(calls.saveImage.length, 1);
      assert.deepStrictEqual(calls.lookupImageLocation[0], [
        ctx,
        'org',
        'site',
        'https://example.com/image2.jpg',
      ]);
    });

    it('should return imageLookup with all processed images', async () => {
      const ctx = TEST_CONTEXT();
      const mockStorageClient = {
        async lookupImageLocation() {
          return null;
        },
        async saveImage() {
          return './media_hash.jpg';
        },
        // eslint-disable-next-line no-empty-function
        async saveImageLocation() {},
      };
      StorageClient.fromContext = () => mockStorageClient;

      global.fetch = async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
        headers: { get: () => 'image/jpeg' },
      });

      crypto.subtle.digest = async () => new Uint8Array([0xaa, 0xbb]).buffer;

      const product = {
        images: [
          { url: 'https://example.com/img1.jpg' },
          { url: './relative.jpg' }, // Should not be in lookup
        ],
        variants: [
          {
            images: [
              { url: 'https://example.com/img2.jpg' },
            ],
          },
        ],
      };

      const result = await extractAndReplaceImages(
        ctx,
        'org',
        'site',
        product,
      );

      assert.strictEqual(Object.keys(result.internal.images).length, 2);
      assert.strictEqual(result.internal.images['https://example.com/img1.jpg'].sourceUrl, './media_hash.jpg');
      assert.strictEqual(result.internal.images['https://example.com/img2.jpg'].sourceUrl, './media_hash.jpg');
      assert.strictEqual(result.internal.images['./relative.jpg'], undefined);
    });
  });

  describe('appendFilenameToMediaUrl()', () => {
    it('returns original URL when filename is missing', () => {
      assert.strictEqual(appendFilenameToMediaUrl('./media_abc123.jpg'), './media_abc123.jpg');
      assert.strictEqual(appendFilenameToMediaUrl('./media_abc123.jpg', ''), './media_abc123.jpg');
    });

    it('returns original URL for non-media URLs', () => {
      assert.strictEqual(
        appendFilenameToMediaUrl('https://example.com/image.jpg', 'blue-mug'),
        'https://example.com/image.jpg',
      );
    });

    it('appends filename to hashed media URL', () => {
      const hash = '13f34abcff863c53e25028911749e9a9d1d6f1c4';
      assert.strictEqual(
        appendFilenameToMediaUrl(`./media_${hash}.jpg`, 'blue-mug'),
        `./media_${hash}/blue-mug.jpg`,
      );
    });

    it('preserves query string after appending filename', () => {
      const hash = '13f34abcff863c53e25028911749e9a9d1d6f1c4';
      assert.strictEqual(
        appendFilenameToMediaUrl(`./media_${hash}.jpg?width=750&format=webp`, 'blue-mug'),
        `./media_${hash}/blue-mug.jpg?width=750&format=webp`,
      );
    });

    it('preserves fragment after appending filename', () => {
      const hash = '13f34abcff863c53e25028911749e9a9d1d6f1c4';
      assert.strictEqual(
        appendFilenameToMediaUrl(`./media_${hash}.jpg#section`, 'blue-mug'),
        `./media_${hash}/blue-mug.jpg#section`,
      );
    });

    it('rejects filename with path traversal', () => {
      const hash = '13f34abcff863c53e25028911749e9a9d1d6f1c4';
      assert.strictEqual(
        appendFilenameToMediaUrl(`./media_${hash}.jpg`, '../secret'),
        `./media_${hash}.jpg`,
      );
    });

    it('rejects filename with slash', () => {
      const hash = '13f34abcff863c53e25028911749e9a9d1d6f1c4';
      assert.strictEqual(
        appendFilenameToMediaUrl(`./media_${hash}.jpg`, 'foo/bar'),
        `./media_${hash}.jpg`,
      );
    });

    it('rejects filename with space', () => {
      const hash = '13f34abcff863c53e25028911749e9a9d1d6f1c4';
      assert.strictEqual(
        appendFilenameToMediaUrl(`./media_${hash}.jpg`, 'foo bar'),
        `./media_${hash}.jpg`,
      );
    });

    it('rejects filename with dot', () => {
      const hash = '13f34abcff863c53e25028911749e9a9d1d6f1c4';
      assert.strictEqual(
        appendFilenameToMediaUrl(`./media_${hash}.jpg`, 'file.name'),
        `./media_${hash}.jpg`,
      );
    });

    it('rejects filename with angle brackets', () => {
      const hash = '13f34abcff863c53e25028911749e9a9d1d6f1c4';
      assert.strictEqual(
        appendFilenameToMediaUrl(`./media_${hash}.jpg`, '<script>'),
        `./media_${hash}.jpg`,
      );
    });

    it('accepts single character filename', () => {
      const hash = '13f34abcff863c53e25028911749e9a9d1d6f1c4';
      assert.strictEqual(
        appendFilenameToMediaUrl(`./media_${hash}.jpg`, 'a'),
        `./media_${hash}/a.jpg`,
      );
    });

    it('accepts filename with underscores and hyphens', () => {
      const hash = '13f34abcff863c53e25028911749e9a9d1d6f1c4';
      assert.strictEqual(
        appendFilenameToMediaUrl(`./media_${hash}.jpg`, 'product_photo-2024'),
        `./media_${hash}/product_photo-2024.jpg`,
      );
    });
  });

  describe('applyImageLookup()', () => {
    it('should replace external URLs with hashed URLs from internal property', () => {
      const product = {
        images: [
          { url: 'https://example.com/image1.jpg' },
          { url: 'https://example.com/image2.jpg' },
          { url: './media_existing.jpg' },
        ],
        variants: [
          {
            images: [
              { url: 'https://example.com/image1.jpg' },
            ],
          },
        ],
        internal: {
          images: {
            'https://example.com/image1.jpg': {
              sourceUrl: './media_hash1.jpg',
              size: 100,
              mimeType: 'image/jpeg',
            },
            'https://example.com/image2.jpg': {
              sourceUrl: './media_hash2.jpg',
              size: 200,
              mimeType: 'image/jpeg',
            },
          },
        },
      };

      const result = applyImageLookup(product);

      assert.strictEqual(result.images[0].url, './media_hash1.jpg');
      assert.strictEqual(result.images[1].url, './media_hash2.jpg');
      assert.strictEqual(result.images[2].url, './media_existing.jpg');
      assert.strictEqual(result.variants[0].images[0].url, './media_hash1.jpg');
    });

    it('should not modify URLs not in internal property', () => {
      const product = {
        images: [
          { url: 'https://example.com/unknown.jpg' },
          { url: './media_existing.jpg' },
        ],
        internal: {
          images: {
            'https://example.com/other.jpg': {
              sourceUrl: './media_hash.jpg',
              size: 100,
              mimeType: 'image/jpeg',
            },
          },
        },
      };

      const result = applyImageLookup(product);

      assert.strictEqual(result.images[0].url, 'https://example.com/unknown.jpg');
      assert.strictEqual(result.images[1].url, './media_existing.jpg');
    });

    it('should handle products with no images', () => {
      const product = {
        sku: 'test-sku',
      };

      const result = applyImageLookup(product);

      assert.strictEqual(result.sku, 'test-sku');
      assert.strictEqual(result.images, undefined);
    });
  });

  describe('hasNewImages()', () => {
    it('should return true if product has new external image URLs', () => {
      const product = {
        images: [
          { url: 'https://example.com/image1.jpg' },
          { url: 'https://example.com/new-image.jpg' },
        ],
        internal: {
          images: {
            'https://example.com/image1.jpg': {
              sourceUrl: './media_hash1.jpg',
              size: 100,
              mimeType: 'image/jpeg',
            },
          },
        },
      };

      const result = hasNewImages(product);

      assert.strictEqual(result, true);
    });

    it('should return false if all external images are in internal property', () => {
      const product = {
        images: [
          { url: 'https://example.com/image1.jpg' },
          { url: 'https://example.com/image2.jpg' },
          { url: './media_existing.jpg' },
        ],
        internal: {
          images: {
            'https://example.com/image1.jpg': {
              sourceUrl: './media_hash1.jpg',
              size: 100,
              mimeType: 'image/jpeg',
            },
            'https://example.com/image2.jpg': {
              sourceUrl: './media_hash2.jpg',
              size: 200,
              mimeType: 'image/jpeg',
            },
          },
        },
      };

      const result = hasNewImages(product);

      assert.strictEqual(result, false);
    });

    it('should return false if product has only relative paths', () => {
      const product = {
        images: [
          { url: './media_existing1.jpg' },
          { url: '/media/existing2.jpg' },
        ],
      };

      const result = hasNewImages(product);

      assert.strictEqual(result, false);
    });

    it('should check variant images too', () => {
      const product = {
        images: [
          { url: 'https://example.com/image1.jpg' },
        ],
        variants: [
          {
            images: [
              { url: 'https://example.com/new-variant-image.jpg' },
            ],
          },
        ],
        internal: {
          images: {
            'https://example.com/image1.jpg': {
              sourceUrl: './media_hash1.jpg',
              size: 100,
              mimeType: 'image/jpeg',
            },
          },
        },
      };

      const result = hasNewImages(product);

      assert.strictEqual(result, true);
    });

    it('should handle products with no images', () => {
      const product = {
        sku: 'test-sku',
      };

      const result = hasNewImages(product);

      assert.strictEqual(result, false);
    });
  });

  describe('extensionFromMimeType()', () => {
    it('should return extension for known mime types', () => {
      assert.strictEqual(extensionFromMimeType('image/jpeg'), 'jpeg');
      assert.strictEqual(extensionFromMimeType('image/jpg'), 'jpeg');
      assert.strictEqual(extensionFromMimeType('image/png'), 'png');
      assert.strictEqual(extensionFromMimeType('image/gif'), 'gif');
      assert.strictEqual(extensionFromMimeType('image/avif'), 'avif');
      assert.strictEqual(extensionFromMimeType('image/webp'), 'webp');
    });

    it('should handle mime types with parameters', () => {
      assert.strictEqual(extensionFromMimeType('image/jpeg; charset=utf-8'), 'jpeg');
      assert.strictEqual(extensionFromMimeType('image/png; q=0.9'), 'png');
    });

    it('should be case insensitive', () => {
      assert.strictEqual(extensionFromMimeType('IMAGE/JPEG'), 'jpeg');
      assert.strictEqual(extensionFromMimeType('Image/Png'), 'png');
    });

    it('should return undefined for unknown or null mime types', () => {
      assert.strictEqual(extensionFromMimeType(null), undefined);
      assert.strictEqual(extensionFromMimeType(''), undefined);
      assert.strictEqual(extensionFromMimeType('application/octet-stream'), undefined);
    });

    it('should return undefined for unsupported image mime types', () => {
      assert.strictEqual(extensionFromMimeType('image/svg+xml'), undefined);
      assert.strictEqual(extensionFromMimeType('image/tiff'), undefined);
      assert.strictEqual(extensionFromMimeType('image/bmp'), undefined);
      assert.strictEqual(extensionFromMimeType('image/x-icon'), undefined);
      assert.strictEqual(extensionFromMimeType('video/mp4'), undefined);
    });
  });

  describe('extractExtension()', () => {
    it('should extract common image extensions', () => {
      assert.strictEqual(extractExtension('https://example.com/image.jpg'), 'jpg');
      assert.strictEqual(extractExtension('https://example.com/image.png'), 'png');
      assert.strictEqual(extractExtension('https://example.com/image.gif'), 'gif');
      assert.strictEqual(extractExtension('https://example.com/image.webp'), 'webp');
      assert.strictEqual(extractExtension('https://example.com/image.avif'), 'avif');
      assert.strictEqual(extractExtension('https://example.com/image.svg'), 'svg');
    });

    it('should return undefined for extensionless URLs', () => {
      assert.strictEqual(
        extractExtension('https://s7d9.scene7.com/is/image/danaherstage/leica-microsystems-mica-embryo-product-image1'),
        undefined,
      );
      assert.strictEqual(
        extractExtension('https://example.com/images/photo'),
        undefined,
      );
    });

    it('should not treat domain TLD as an extension', () => {
      assert.strictEqual(
        extractExtension('https://s7d9.scene7.com/is/image/danaherstage/product-image1'),
        undefined,
      );
      assert.notStrictEqual(
        extractExtension('https://s7d9.scene7.com/is/image/test'),
        'com/is/image/test',
      );
    });

    it('should strip query params from extension', () => {
      assert.strictEqual(extractExtension('https://example.com/image.jpg?w=200'), 'jpg');
      assert.strictEqual(extractExtension('https://example.com/image.png?w=200&h=300'), 'png');
    });

    it('should strip hash from extension', () => {
      assert.strictEqual(extractExtension('https://example.com/image.jpg#section'), 'jpg');
    });

    it('should handle URLs with multiple dots in path', () => {
      assert.strictEqual(extractExtension('https://example.com/path/file.name.jpg'), 'jpg');
      assert.strictEqual(extractExtension('https://example.com/v1.2/image.png'), 'png');
    });

    it('should return undefined for invalid URLs', () => {
      assert.strictEqual(extractExtension('not a url'), undefined);
      assert.strictEqual(extractExtension(''), undefined);
    });

    it('should handle URLs with port numbers', () => {
      assert.strictEqual(extractExtension('https://example.com:8080/image.jpg'), 'jpg');
    });

    it('should handle deep paths', () => {
      assert.strictEqual(extractExtension('https://cdn.example.com/a/b/c/d/image.webp'), 'webp');
    });
  });
});
