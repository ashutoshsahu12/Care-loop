import { AppRouter } from "./routes/router";
import type { ID1Database } from "./db/client";

export interface Env {
  DB?: any;
  ENVIRONMENT?: string;
  APP_NAME?: string;
}

function getDatabase(env: Env): ID1Database | null {
  return env.DB && typeof env.DB.prepare === "function" ? env.DB as ID1Database : null;
}

export default {
  async fetch(request: Request, env: Env = {}): Promise<Response> {
    const db = getDatabase(env);
    if (!db) {
      return new Response(JSON.stringify({ message: "Database binding DB is missing." }), {
        status: 503, headers: { "Content-Type": "application/json" },
      });
    }
    const router = new AppRouter(db);
    return router.handle(request);
  },
};
