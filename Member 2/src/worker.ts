import { AppRouter } from "./routes/router";
import { createTestOrLocalDb, type ID1Database } from "./db/client";

export interface Env {
  DB?: any;
  ENVIRONMENT?: string;
  APP_NAME?: string;
}

let cachedDb: ID1Database | null = null;

function getDatabase(env: Env): ID1Database {
  if (env.DB && typeof env.DB.prepare === "function") {
    // Cloudflare D1 Database binding
    return env.DB as ID1Database;
  }

  // Local / test in-memory or fallback SQLite database
  if (!cachedDb) {
    cachedDb = createTestOrLocalDb({ seed: true });
  }
  return cachedDb;
}

export default {
  async fetch(request: Request, env: Env = {}): Promise<Response> {
    const db = getDatabase(env);
    const router = new AppRouter(db);
    return router.handle(request);
  },
};
