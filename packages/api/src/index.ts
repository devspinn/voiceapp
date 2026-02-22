import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { createDb } from "@voiceapp/db";
import { createAuth } from "@voiceapp/auth";
import { createApp } from "./server.js";
import { setupWebSocket } from "./lib/ws.js";
import { createLocalStorage } from "./services/storage.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const db = createDb(databaseUrl);
const auth = createAuth(db);
const storage = createLocalStorage();
const app = createApp({ db, auth, storage });

const port = 3002;

const server = serve({
  fetch: app.fetch,
  port,
});

const wss = new WebSocketServer({ server: server as any, path: "/ws" });
setupWebSocket(wss, auth);

console.log(`API server running on http://localhost:${port}`);
console.log(`WebSocket server running on ws://localhost:${port}/ws`);
