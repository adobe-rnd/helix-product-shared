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
  applyImageLookup,
  hasNewImages,
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

      const { product: result, imageLookup } = await extractAndReplaceImages(ctx, 'org', 'site', product);

      assert.strictEqual(result.images[0].url, './media_abc123.jpg');
      assert.strictEqual(imageLookup['https://example.com/image.jpg'], './media_abc123.jpg');
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

      const { product: result } = await extractAndReplaceImages(ctx, 'org', 'site', product);

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

      const { product: result } = await extractAndReplaceImages(ctx, 'org', 'site', product);

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

      const { product: result } = await extractAndReplaceImages(ctx, 'org', 'site', product);

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

      const { product: result } = await extractAndReplaceImages(ctx, 'org', 'site', product);

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

      const { product: result } = await extractAndReplaceImages(ctx, 'org', 'site', product);

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

      const { product: result } = await extractAndReplaceImages(ctx, 'org', 'site', product);

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

      const { product: result } = await extractAndReplaceImages(ctx, 'org', 'site', product);

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
      };

      const existingLookup = {
        'https://example.com/image1.jpg': './media_existing123.jpg',
      };

      const { product: result, imageLookup } = await extractAndReplaceImages(
        ctx,
        'org',
        'site',
        product,
        existingLookup,
      );

      // First image should use existing lookup, second should be fetched
      assert.strictEqual(result.images[0].url, './media_existing123.jpg');
      assert.strictEqual(result.images[1].url, './media_new123.jpg');

      // Lookup should include both images
      assert.strictEqual(imageLookup['https://example.com/image1.jpg'], './media_existing123.jpg');
      assert.strictEqual(imageLookup['https://example.com/image2.jpg'], './media_new123.jpg');

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

      const { imageLookup } = await extractAndReplaceImages(
        ctx,
        'org',
        'site',
        product,
      );

      assert.strictEqual(Object.keys(imageLookup).length, 2);
      assert.strictEqual(imageLookup['https://example.com/img1.jpg'], './media_hash.jpg');
      assert.strictEqual(imageLookup['https://example.com/img2.jpg'], './media_hash.jpg');
      assert.strictEqual(imageLookup['./relative.jpg'], undefined);
    });
  });

  describe('applyImageLookup()', () => {
    it('should replace external URLs with hashed URLs from lookup', () => {
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
      };

      const imageLookup = {
        'https://example.com/image1.jpg': './media_hash1.jpg',
        'https://example.com/image2.jpg': './media_hash2.jpg',
      };

      const result = applyImageLookup(product, imageLookup);

      assert.strictEqual(result.images[0].url, './media_hash1.jpg');
      assert.strictEqual(result.images[1].url, './media_hash2.jpg');
      assert.strictEqual(result.images[2].url, './media_existing.jpg');
      assert.strictEqual(result.variants[0].images[0].url, './media_hash1.jpg');
    });

    it('should not modify URLs not in lookup', () => {
      const product = {
        images: [
          { url: 'https://example.com/unknown.jpg' },
          { url: './media_existing.jpg' },
        ],
      };

      const imageLookup = {
        'https://example.com/other.jpg': './media_hash.jpg',
      };

      const result = applyImageLookup(product, imageLookup);

      assert.strictEqual(result.images[0].url, 'https://example.com/unknown.jpg');
      assert.strictEqual(result.images[1].url, './media_existing.jpg');
    });

    it('should handle products with no images', () => {
      const product = {
        sku: 'test-sku',
      };

      const imageLookup = {
        'https://example.com/image.jpg': './media_hash.jpg',
      };

      const result = applyImageLookup(product, imageLookup);

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
      };

      const imageLookup = {
        'https://example.com/image1.jpg': './media_hash1.jpg',
      };

      const result = hasNewImages(product, imageLookup);

      assert.strictEqual(result, true);
    });

    it('should return false if all external images are in lookup', () => {
      const product = {
        images: [
          { url: 'https://example.com/image1.jpg' },
          { url: 'https://example.com/image2.jpg' },
          { url: './media_existing.jpg' },
        ],
      };

      const imageLookup = {
        'https://example.com/image1.jpg': './media_hash1.jpg',
        'https://example.com/image2.jpg': './media_hash2.jpg',
      };

      const result = hasNewImages(product, imageLookup);

      assert.strictEqual(result, false);
    });

    it('should return false if product has only relative paths', () => {
      const product = {
        images: [
          { url: './media_existing1.jpg' },
          { url: '/media/existing2.jpg' },
        ],
      };

      const imageLookup = {};

      const result = hasNewImages(product, imageLookup);

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
      };

      const imageLookup = {
        'https://example.com/image1.jpg': './media_hash1.jpg',
      };

      const result = hasNewImages(product, imageLookup);

      assert.strictEqual(result, true);
    });

    it('should handle products with no images', () => {
      const product = {
        sku: 'test-sku',
      };

      const imageLookup = {};

      const result = hasNewImages(product, imageLookup);

      assert.strictEqual(result, false);
    });
  });
});
