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
import { describe, it } from 'node:test';
import { slugger } from '../src/slugger.js';

describe('Slugger', () => {
  it('returns empty string for non-string inputs', () => {
    assert.strictEqual(slugger(null), '');
    assert.strictEqual(slugger(undefined), '');
    assert.strictEqual(slugger(123), '');
    assert.strictEqual(slugger({}), '');
    assert.strictEqual(slugger([]), '');
    assert.strictEqual(slugger(true), '');
    assert.strictEqual(slugger(false), '');
  });

  it('converts to lowercase', () => {
    assert.strictEqual(slugger('HELLO'), 'hello');
    assert.strictEqual(slugger('Hello World'), 'hello-world');
    assert.strictEqual(slugger('MIXED Case'), 'mixed-case');
    assert.strictEqual(slugger('UPPERCASE'), 'uppercase');
  });

  it('replaces spaces with hyphens', () => {
    assert.strictEqual(slugger('hello world'), 'hello-world');
    assert.strictEqual(slugger('hello  world'), 'hello-world');
    assert.strictEqual(slugger('hello   world'), 'hello-world');
    assert.strictEqual(slugger('hello\tworld'), 'hello-world');
    assert.strictEqual(slugger('hello\nworld'), 'hello-world');
    assert.strictEqual(slugger('hello\r\nworld'), 'hello-world');
  });

  it('removes forward slashes', () => {
    assert.strictEqual(slugger('hello/world'), 'hello-world');
    assert.strictEqual(slugger('hello/world/test'), 'hello-world-test');
    assert.strictEqual(slugger('/hello/world/'), 'hello-world');
    assert.strictEqual(slugger('hello//world'), 'hello-world');
  });

  it('removes leading and trailing hyphens', () => {
    assert.strictEqual(slugger('-hello-'), 'hello');
    assert.strictEqual(slugger('--hello--'), 'hello');
    assert.strictEqual(slugger('---hello---'), 'hello');
    assert.strictEqual(slugger('-hello world-'), 'hello-world');
    assert.strictEqual(slugger('--hello world--'), 'hello-world');
  });

  it('handles complex SKUs with multiple transformations', () => {
    assert.strictEqual(slugger('Product Name 123'), 'product-name-123');
    assert.strictEqual(slugger('SKU-ABC-123'), 'sku-abc-123');
    assert.strictEqual(slugger('Product/Name/With/Slashes'), 'product-name-with-slashes');
    assert.strictEqual(slugger('  Product Name  '), 'product-name');
    assert.strictEqual(slugger('-Product-Name-'), 'product-name');
    assert.strictEqual(slugger('Product/Name/'), 'product-name');
  });

  it('handles edge cases', () => {
    assert.strictEqual(slugger(''), '');
    assert.strictEqual(slugger('   '), '');
    assert.strictEqual(slugger('---'), '');
    assert.strictEqual(slugger('///'), '');
    assert.strictEqual(slugger('   ---   '), '');
    assert.strictEqual(slugger('a'), 'a');
    assert.strictEqual(slugger('A'), 'a');
    assert.strictEqual(slugger('1'), '1');
  });

  it('handles special characters', () => {
    assert.strictEqual(slugger('hello@world'), 'helloworld');
    assert.strictEqual(slugger('hello#world'), 'helloworld');
    assert.strictEqual(slugger('hello$world'), 'helloworld');
    assert.strictEqual(slugger('hello%world'), 'helloworld');
    assert.strictEqual(slugger('hello^world'), 'helloworld');
    assert.strictEqual(slugger('hello&world'), 'helloworld');
    assert.strictEqual(slugger('hello*world'), 'helloworld');
    assert.strictEqual(slugger('hello(world)'), 'helloworld');
    assert.strictEqual(slugger('hello[world]'), 'helloworld');
    assert.strictEqual(slugger('hello{world}'), 'helloworld');
  });

  it('handles numbers and mixed content', () => {
    assert.strictEqual(slugger('123'), '123');
    assert.strictEqual(slugger('Product 123'), 'product-123');
    assert.strictEqual(slugger('123 Product'), '123-product');
    assert.strictEqual(slugger('Product-123'), 'product-123');
    assert.strictEqual(slugger('Product_123'), 'product-123');
  });

  it('handles multiple consecutive transformations', () => {
    assert.strictEqual(slugger('  Product / Name / 123  '), 'product-name-123');
    assert.strictEqual(slugger('---Product---Name---'), 'product-name');
    assert.strictEqual(slugger('///Product///Name///'), 'product-name');
    assert.strictEqual(slugger('   /   Product   /   Name   /   '), 'product-name');
  });
});
