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
 * A custom error that includes a response property.
 * @extends Error
 */
export class ResponseError extends Error {
  /**
   * Creates a ResponseError instance.
   * @param {string} message - The error message.
   * @param {Response} response
   */
  constructor(message, response) {
    super(message);
    this.response = response;

    // Set the prototype explicitly for correct instance checks
    Object.setPrototypeOf(this, ResponseError.prototype);
  }
}

/**
 * @param {number} status - The HTTP status code.
 * @param {string} xError - The error message.
 * @param {string|Record<string,unknown>} [body=''] - The response body.
 * @returns {Response} - A response object.
 */
export function errorResponse(status, xError, body = '') {
  // @ts-ignore
  return new Response(typeof body === 'object' ? JSON.stringify(body) : body, {
    status,
    headers: { 'x-error': xError },
  });
}

/**
 * @param {number} status - The HTTP status code.
 * @param {string} xError - The error message.
 * @param {string|Record<string,unknown>} [body=''] - The response body.
 * @returns {Error & {response: Response}}
 */
export function errorWithResponse(status, xError, body = '') {
  const response = errorResponse(status, xError, body);
  const error = new ResponseError(xError, response);
  return error;
}
