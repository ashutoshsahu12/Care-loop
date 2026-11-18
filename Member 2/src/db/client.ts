import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (path: string) => IDatabaseSync };

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

export class NodeSqlitePreparedStatement implements ID1PreparedStatement {
  private db: IDatabaseSync;
  private sql: string;
  private params: unknown[] = [];

  constructor(db: IDatabaseSync, sql: string, params: unknown[] = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...values: unknown[]): ID1PreparedStatement {
    return new NodeSqlitePreparedStatement(this.db, this.sql, values);
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    try {
      const stmt = this.db.prepare(this.sql);
      const row = stmt.get(...(this.params as (string | number | bigint | null | Uint8Array)[])) as Record<string, unknown> | undefined;
      if (!row) return null;
      if (colName) {
        return (row[colName] as T) ?? null;
      }
      return row as T;
    } catch (err: unknown) {
      throw new Error(`SQL Error in first(): ${(err as Error).message} - Query: ${this.sql}`);
    }
  }

  async run<T = unknown>(): Promise<ID1Result<T>> {
    try {
      const stmt = this.db.prepare(this.sql);
      const info = stmt.run(...(this.params as (string | number | bigint | null | Uint8Array)[]));
      return {
        results: [] as T[],
        success: true,
        meta: {
          changes: Number(info.changes),
          last_row_id: Number(info.lastInsertRowid),
        },
      };
    } catch (err: unknown) {
      throw new Error(`SQL Error in run(): ${(err as Error).message} - Query: ${this.sql}`);
    }
  }

  async all<T = unknown>(): Promise<ID1Result<T>> {
    try {
      const stmt = this.db.prepare(this.sql);
      const rows = stmt.all(...(this.params as (string | number | bigint | null | Uint8Array)[])) as T[];
      return {
        results: rows,
        success: true,
        meta: { count: rows.length },
      };
    } catch (err: unknown) {
      throw new Error(`SQL Error in all(): ${(err as Error).message} - Query: ${this.sql}`);
    }
  }

  getSql(): string {
    return this.sql;
  }

  getParams(): unknown[] {
    return this.params;
  }
}

export class NodeSqliteDatabase implements ID1Database {
  private db: IDatabaseSync;

  constructor(databasePath: string = ":memory:") {
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA foreign_keys = ON;");
  }

  prepare(query: string): ID1PreparedStatement {
    return new NodeSqlitePreparedStatement(this.db, query);
  }

  async batch<T = unknown>(statements: ID1PreparedStatement[]): Promise<ID1Result<T>[]> {
    const results: ID1Result<T>[] = [];
    this.db.exec("BEGIN TRANSACTION;");
    try {
      for (const stmt of statements) {
        const res = await stmt.run<T>();
        results.push(res);
      }
      this.db.exec("COMMIT;");
      return results;
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    }
  }

  async exec(query: string): Promise<{ count: number; duration: number }> {
    const start = Date.now();
    this.db.exec(query);
    return { count: 1, duration: Date.now() - start };
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Creates an in-memory or file-backed database initialized with schema and seed data.
 */
export function createTestOrLocalDb(options: { seed?: boolean; path?: string } = {}): ID1Database {
  const db = new NodeSqliteDatabase(options.path ?? ":memory:");
  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  const schemaPath = path.join(currentDir, "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    db.exec(schemaSql);
  }

  if (options.seed) {
    const seedPath = path.join(currentDir, "seed.sql");
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, "utf-8");
      db.exec(seedSql);
    }
  }

  return db;
}
