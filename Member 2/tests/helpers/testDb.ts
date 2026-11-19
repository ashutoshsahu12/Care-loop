import type { ID1Database } from "../../src/db/client";
import { createTestOrLocalDb } from "../../src/db/localDb";
import { AppRouter } from "../../src/routes/router";

export function getFreshTestDb(): ID1Database {
  return createTestOrLocalDb({ seed: true });
}

export function getFreshRouter(): { db: ID1Database; router: AppRouter } {
  const db = getFreshTestDb();
  const router = new AppRouter(db);
  return { db, router };
}
