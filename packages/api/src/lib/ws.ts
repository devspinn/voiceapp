import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Auth } from "@voiceapp/auth";

// userId -> Set of connected WebSockets
const connections = new Map<string, Set<WebSocket>>();

export type WSEvent =
  | { type: "new_message"; conversationId: string; messageId: string }
  | { type: "message_updated"; conversationId: string; messageId: string };

export function notifyUser(userId: string, event: WSEvent) {
  const userSockets = connections.get(userId);
  if (!userSockets) return;

  const data = JSON.stringify(event);
  for (const ws of userSockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

export function setupWebSocket(wss: WebSocketServer, auth: Auth) {
  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    // Pass cookies from the HTTP upgrade request to Better Auth
    const headers = new Headers();
    if (req.headers.cookie) {
      headers.set("cookie", req.headers.cookie);
    }

    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      ws.close(1008, "Invalid session");
      return;
    }

    const userId = session.user.id;

    if (!connections.has(userId)) {
      connections.set(userId, new Set());
    }
    connections.get(userId)!.add(ws);

    ws.on("close", () => {
      const userSockets = connections.get(userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          connections.delete(userId);
        }
      }
    });

    ws.on("pong", () => {
      (ws as any).__isAlive = true;
    });
    (ws as any).__isAlive = true;
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if ((ws as any).__isAlive === false) {
        ws.terminate();
        return;
      }
      (ws as any).__isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });
}
