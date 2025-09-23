export interface MediaData {
  data: ArrayBuffer;
  hash: string;
  length: number;
  mimeType: string;
  extension?: string;
  sourceUrl: string;
}