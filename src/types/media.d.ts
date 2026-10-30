export interface MediaData {
  data: ArrayBuffer;
  hash: string;
  length: number;
  mimeType: string;
  extension?: string;
  sourceUrl: string;
}
/**
 * An image that `extractAndReplaceImages` failed to collect. `status` is the origin's
 * HTTP status, undefined when the fetch or the media storage write threw; `retryable`
 * is false only for origin statuses that won't change on retry (e.g. 404).
 */
export interface ImageFetchFailure {
  url: string;
  status?: number;
  retryable: boolean;
}
