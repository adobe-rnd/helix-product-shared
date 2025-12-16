export declare class ResponseError extends Error {
  response: Response;
}

/**
 * @param {number} status - The HTTP status code.
 * @param {string} xError - The error message.
 * @param {string|Record<string,unknown>} [body=''] - The response body.
 * @returns {Response} - A response object.
 */
export declare function errorResponse(status: number, xError: string, body?: string | Record<string, unknown>): Response;

/**
 * @param {number} status - The HTTP status code.
 * @param {string} xError - The error message.
 * @param {string|Record<string,unknown>} [body=''] - The response body.
 * @returns {ResponseError}
 */
export declare function errorWithResponse(status: number, xError: string, body?: string | Record<string, unknown>): ResponseError;