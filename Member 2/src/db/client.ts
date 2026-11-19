/** Shared D1-compatible database contracts for Node tests and Cloudflare Workers. */
export interface IDatabaseSync {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  };
}

export interface ID1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
  error?: string;
}

export interface ID1PreparedStatement {
  bind(...values: unknown[]): ID1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<ID1Result<T>>;
  all<T = unknown>(): Promise<ID1Result<T>>;
}

export interface ID1Database {
  prepare(query: string): ID1PreparedStatement;
  batch<T = unknown>(statements: ID1PreparedStatement[]): Promise<ID1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}
