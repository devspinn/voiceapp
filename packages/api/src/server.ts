import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { trpcServer } from "@hono/trpc-server";
import { router } from "./router.js";
import { conversationsRouter } from "./routers/conversations.js";
import { messagesRouter } from "./routers/messages.js";
import { usersRouter } from "./routers/users.js";
import type { AppContext } from "./context.js";

export const appRouter = router({
  conversations: conversationsRouter,
  messages: messagesRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;

export function createApp(ctx: AppContext) {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: ["http://localhost:5173"],
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  );

  // Better Auth routes
  app.on(["GET", "POST"], "/api/auth/**", async (c) => {
    return ctx.auth.handler(c.req.raw);
  });

  // Serve uploaded audio files
  app.use("/uploads/*", serveStatic({ root: "./" }));

  // tRPC routes
  app.use(
    "/trpc/*",
    trpcServer({
      router: appRouter,
      createContext: (_opts, c) => ({
        ...ctx,
        headers: c.req.raw.headers,
      }),
    })
  );

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  return app;
}
