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
import { extractAndReplaceImages } from '../src/media.js';
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
  });
});
