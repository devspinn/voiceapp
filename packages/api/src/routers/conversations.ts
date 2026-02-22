import { z } from "zod";
import { router, authedProcedure } from "../router.js";
import {
  conversation,
  conversationParticipant,
  message,
  user,
} from "@voiceapp/db";
import { eq, desc, and, ne, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export const conversationsRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    // Get conversation IDs the user participates in
    const myParticipations = await ctx.db
      .select({ conversationId: conversationParticipant.conversationId })
      .from(conversationParticipant)
      .where(eq(conversationParticipant.userId, ctx.user.id));

    if (myParticipations.length === 0) return [];

    const conversationIds = myParticipations.map((p) => p.conversationId);

    // Get conversations with the other participant's info and last message
    const conversations = await ctx.db
      .select({
        id: conversation.id,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })
      .from(conversation)
      .where(inArray(conversation.id, conversationIds))
      .orderBy(desc(conversation.updatedAt));

    // For each conversation, get the other user and last message
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipant = await ctx.db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
          })
          .from(conversationParticipant)
          .innerJoin(user, eq(conversationParticipant.userId, user.id))
          .where(
            and(
              eq(conversationParticipant.conversationId, conv.id),
              ne(conversationParticipant.userId, ctx.user.id)
            )
          )
          .limit(1);

        const lastMessage = await ctx.db
          .select({
            id: message.id,
            text: message.text,
            originalType: message.originalType,
            createdAt: message.createdAt,
            senderId: message.senderId,
          })
          .from(message)
          .where(eq(message.conversationId, conv.id))
          .orderBy(desc(message.createdAt))
          .limit(1);

        return {
          ...conv,
          otherUser: otherParticipant[0] ?? null,
          lastMessage: lastMessage[0] ?? null,
        };
      })
    );

    return result;
  }),

  get: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user is a participant
      const participation = await ctx.db
        .select()
        .from(conversationParticipant)
        .where(
          and(
            eq(conversationParticipant.conversationId, input.id),
            eq(conversationParticipant.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (participation.length === 0) {
        throw new Error("Not a participant");
      }

      const conv = await ctx.db
        .select()
        .from(conversation)
        .where(eq(conversation.id, input.id))
        .limit(1);

      if (conv.length === 0) {
        throw new Error("Conversation not found");
      }

      const otherParticipant = await ctx.db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
        })
        .from(conversationParticipant)
        .innerJoin(user, eq(conversationParticipant.userId, user.id))
        .where(
          and(
            eq(conversationParticipant.conversationId, input.id),
            ne(conversationParticipant.userId, ctx.user.id)
          )
        )
        .limit(1);

      return {
        ...conv[0],
        otherUser: otherParticipant[0] ?? null,
      };
    }),

  create: authedProcedure
    .input(z.object({ otherUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Find existing conversation between these two users
      const myConvos = await ctx.db
        .select({ conversationId: conversationParticipant.conversationId })
        .from(conversationParticipant)
        .where(eq(conversationParticipant.userId, ctx.user.id));

      if (myConvos.length > 0) {
        const myConvoIds = myConvos.map((c) => c.conversationId);
        const existing = await ctx.db
          .select({ conversationId: conversationParticipant.conversationId })
          .from(conversationParticipant)
          .where(
            and(
              inArray(conversationParticipant.conversationId, myConvoIds),
              eq(conversationParticipant.userId, input.otherUserId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          return { id: existing[0].conversationId };
        }
      }

      // Create new conversation
      const convId = nanoid();
      const now = new Date();

      await ctx.db.insert(conversation).values({
        id: convId,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert(conversationParticipant).values([
        { id: nanoid(), conversationId: convId, userId: ctx.user.id },
        { id: nanoid(), conversationId: convId, userId: input.otherUserId },
      ]);

      return { id: convId };
    }),
});
