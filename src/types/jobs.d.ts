export interface IndexingJobProduct {
  sku: string;
  action?: 'add' | 'update' | 'delete' | string; // defaults to update
}

export interface IndexingJob {
  org: string;
  site: string;
  storeCode: string;
  storeViewCode: string;
  products: IndexingJobProduct[];
  timestamp: number;
}

export interface ImageCollectorJob extends IndexingJob {
}