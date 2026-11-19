import http from "node:http";
import worker from "./worker";
import { createTestOrLocalDb } from "./db/localDb";

// Reuse the same seeded synthetic records across local backend restarts.
// Set DATABASE_PATH=:memory: when a disposable demo session is preferred.
const databasePath = process.env.DATABASE_PATH || "careloop-local.sqlite";
const localDb = createTestOrLocalDb({ seed: true, path: databasePath });

const PORT = Number(process.env.PORT || 8787);

const server = http.createServer(async (req, res) => {
  try {
    const url = `http://${req.headers.host || "localhost:" + PORT}${req.url}`;
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val) {
        if (Array.isArray(val)) {
          val.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, val);
        }
      }
    }

    const method = req.method || "GET";
    let body: Buffer | undefined;
    if (method !== "GET" && method !== "HEAD") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      body = Buffer.concat(chunks);
    }

    const webReq = new Request(url, {
      method,
      headers,
      body: body && body.length > 0 ? (body as unknown as BodyInit) : undefined,
    });

    const webRes = await worker.fetch(webReq, { DB: localDb });

    res.statusCode = webRes.status;
    webRes.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    const resBody = await webRes.arrayBuffer();
    res.end(Buffer.from(resBody));
  } catch (err: unknown) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: (err as Error).message || "Internal Server Error" }));
  }
});

server.listen(PORT, () => {
  console.log(`CARELOOP Care Coordination Engine running at http://localhost:${PORT}`);
});

export default server;
