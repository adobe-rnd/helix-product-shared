export interface IndexingJobProduct {
  path: string;
  action?: 'add' | 'update' | 'delete' | string; // defaults to update
  /**
   * Target index root path (e.g. `/us/en_us/products`, or `/` for the root
   * index). When set, the indexer applies the action to exactly this index;
   * when absent, the indexer resolves the product's target indices itself.
   */
  rootPath?: string;
}

export interface IndexingJob {
  org: string;
  site: string;
  products: IndexingJobProduct[];
  timestamp: number;
}

export interface ImageCollectorJob extends IndexingJob { }