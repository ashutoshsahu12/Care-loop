import initSqlJs, { type Database, type SqlValue } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm-browser.wasm?url";
import schema from "../../../Member 2/src/db/schema.sql?raw";
import seed from "../../../Member 2/src/db/seed.sql?raw";
import type { ID1Database, ID1PreparedStatement, ID1Result } from "../../../Member 2/src/db/client";
import worker from "../../../Member 2/src/worker";
import { browserDatabaseKey } from "../services/demoTransport";

function statement(db: Database, sql: string, values: SqlValue[] = []): ID1PreparedStatement {
  const read = (single: boolean) => {
    const query = db.prepare(sql, values);
    try {
      const rows: ReturnType<typeof query.getAsObject>[] = [];
      while (query.step()) {
        rows.push(query.getAsObject());
        if (single) break;
      }
      return rows;
    } finally {
      query.free();
    }
  };

  return {
    bind: (...params) => statement(db, sql, params as SqlValue[]),
    async first<T>(column?: string) {
      const [row] = read(true);
      return (column ? row?.[column] ?? null : row ?? null) as T | null;
    },
    async all<T>() {
      const rows = read(false) as T[];
      return { success: true, results: rows, meta: { count: rows.length } };
    },
    async run<T>() {
      db.run(sql, values);
      return { success: true, results: [] as T[], meta: { changes: db.getRowsModified() } };
    },
  };
}

function adapt(db: Database): ID1Database {
  return {
    prepare: (sql) => statement(db, sql),
    async batch<T>(statements: ID1PreparedStatement[]) {
      db.run("BEGIN");
      try {
        const results: ID1Result<T>[] = [];
        for (const item of statements) results.push(await item.run<T>());
        db.run("COMMIT");
        return results;
      } catch (error) {
        db.run("ROLLBACK");
        throw error;
      }
    },
    async exec(sql) {
      const start = performance.now();
      db.exec(sql);
      return { count: 1, duration: performance.now() - start };
    },
  };
}

async function openDatabase() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl, useOldExtensionFunctions: false });
  const saved = sessionStorage.getItem(browserDatabaseKey);
  const db = new SQL.Database(saved ? Uint8Array.from(atob(saved), (character) => character.charCodeAt(0)) : undefined);
  db.run("PRAGMA foreign_keys = ON");
  if (!saved) db.exec(schema + "\n" + seed);
  return { db, api: adapt(db) };
}

function save(db: Database) {
  const bytes = db.export();
  // SQL.js reopens the database when exporting, so restore connection settings.
  db.run("PRAGMA foreign_keys = ON");
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  sessionStorage.setItem(browserDatabaseKey, btoa(binary));
}

let database: ReturnType<typeof openDatabase> | undefined;
let previous: Promise<unknown> = Promise.resolve();

export function runBrowserRequest(request: Request): Promise<Response> {
  // Serialize requests so a write and its saved snapshot finish before the next request.
  const response = previous.then(async () => {
    const { db, api } = await (database ??= openDatabase());
    const result = await worker.fetch(request, { DB: api });
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && result.ok) save(db);
    return result;
  });
  previous = response.catch(() => {});
  return response;
}
