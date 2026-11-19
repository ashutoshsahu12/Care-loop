import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createTestOrLocalDb, NodeSqliteDatabase } from "../src/db/localDb";

describe("local hackathon database persistence", () => {
  it("preserves demo edits across restarts without reseeding over them", async () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "careloop-db-"));
    const dbPath = path.join(temporary, "demo.sqlite");
    try {
      const first = createTestOrLocalDb({ path: dbPath, seed: true }) as NodeSqliteDatabase;
      try {
        await first.prepare("UPDATE patients SET phone = ? WHERE id = ?")
          .bind("0000000000", "pat-1001").run();
      } finally {
        first.close();
      }

      const reopened = createTestOrLocalDb({ path: dbPath, seed: true }) as NodeSqliteDatabase;
      try {
        const result = await reopened.prepare("SELECT phone FROM patients WHERE id = ?")
          .bind("pat-1001").first<{ phone: string }>();
        expect(result?.phone).toBe("0000000000");
      } finally {
        reopened.close();
      }
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });
});
