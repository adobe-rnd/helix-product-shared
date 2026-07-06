export interface IndexingJobProduct {
  path: string;
  action?: 'add' | 'update' | 'delete' | string; // defaults to update
}

export interface IndexingJob {
  org: string;
  site: string;
  products: IndexingJobProduct[];
  timestamp: number;
}

export interface ImageCollectorJob extends IndexingJob { }