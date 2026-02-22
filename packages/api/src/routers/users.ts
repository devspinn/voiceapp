import { z } from "zod";
import { router, authedProcedure } from "../router.js";
import { user } from "@voiceapp/db";
import { like, and, ne, or } from "drizzle-orm";

export const usersRouter = router({
  me: authedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  search: authedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const pattern = `%${input.query}%`;
      const results = await ctx.db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
        })
        .from(user)
        .where(
          and(
            ne(user.id, ctx.user.id),
            or(like(user.name, pattern), like(user.email, pattern))
          )
        )
        .limit(10);

      return results;
    }),
});
