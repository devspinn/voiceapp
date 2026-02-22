import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { AppContext, AuthedContext } from "./context.js";

// We pass the full context including request headers for auth
export interface TRPCContext extends AppContext {
  headers: Headers;
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const session = await ctx.auth.api.getSession({
    headers: ctx.headers,
  });

  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      user: session.user,
    } satisfies AuthedContext & { headers: Headers },
  });
});
