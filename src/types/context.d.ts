export interface Context {
  env: Record<string, any>;
  log: Console;

  attributes: {
    [key: string]: any;
  };
}