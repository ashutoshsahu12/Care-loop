import type { ID1Database } from "./client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function runMigrationsAndSeed(db: ID1Database): Promise<void> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const schemaSql = fs.readFileSync(path.join(currentDir, "schema.sql"), "utf-8");
  await db.exec(schemaSql);

  const seedSql = fs.readFileSync(path.join(currentDir, "seed.sql"), "utf-8");
  await db.exec(seedSql);
}
