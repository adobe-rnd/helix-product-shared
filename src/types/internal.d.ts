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

import type { ProductBusEntry } from './public.js';

/**
 * Internal data stored with products for optimization purposes.
 * This data should not be exposed to external APIs.
 */
export interface ProductBusEntryInternal extends ProductBusEntry {
  /**
   * Internal metadata for image optimization.
   * Maps external image URLs to their processed media data.
   */
  internal?: {
    images: {
      [externalUrl: string]: {
        sourceUrl: string; // the media hash path
        size: number; // file size in bytes
        mimeType: string;
      };
    };
  };
}
