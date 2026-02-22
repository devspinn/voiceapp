import { z } from "zod";
import { router, authedProcedure } from "../router.js";
import {
  message,
  conversation,
  conversationParticipant,
} from "@voiceapp/db";
import { eq, and, desc, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { notifyUser } from "../lib/ws.js";
import { transcribeAudio, generateSpeech } from "../services/openai.js";
import type { Database } from "@voiceapp/db";
import type { StorageService } from "../services/storage.js";

async function getConversationParticipantIds(
  db: Database,
  conversationId: string
): Promise<string[]> {
  const participants = await db
    .select({ userId: conversationParticipant.userId })
    .from(conversationParticipant)
    .where(eq(conversationParticipant.conversationId, conversationId));
  return participants.map((p) => p.userId);
}

function notifyAllParticipants(
  participantIds: string[],
  event: Parameters<typeof notifyUser>[1]
) {
  for (const userId of participantIds) {
    notifyUser(userId, event);
  }
}

// Background: transcribe voice message
async function processVoiceMessage(
  db: Database,
  storage: StorageService,
  msgId: string,
  conversationId: string,
  audioFilename: string
) {
  try {
    await db
      .update(message)
      .set({ processingStatus: "processing" })
      .where(eq(message.id, msgId));

    const filePath = storage.getAudioPath(audioFilename);
    const text = await transcribeAudio(filePath);

    await db
      .update(message)
      .set({ text, processingStatus: "completed" })
      .where(eq(message.id, msgId));

    const participantIds = await getConversationParticipantIds(db, conversationId);
    notifyAllParticipants(participantIds, {
      type: "message_updated",
      conversationId,
      messageId: msgId,
    });
  } catch (err) {
    console.error("Voice transcription failed:", err);
    await db
      .update(message)
      .set({ processingStatus: "failed" })
      .where(eq(message.id, msgId));
  }
}

// Background: generate TTS for text message
async function processTextToSpeech(
  db: Database,
  storage: StorageService,
  msgId: string,
  conversationId: string,
  text: string
) {
  try {
    await db
      .update(message)
      .set({ processingStatus: "processing" })
      .where(eq(message.id, msgId));

    const filename = `${msgId}-tts.mp3`;
    const audioUrl = await generateSpeech(text, storage, filename);

    await db
      .update(message)
      .set({ audioUrl, processingStatus: "completed" })
      .where(eq(message.id, msgId));

    const participantIds = await getConversationParticipantIds(db, conversationId);
    notifyAllParticipants(participantIds, {
      type: "message_updated",
      conversationId,
      messageId: msgId,
    });
  } catch (err) {
    console.error("TTS generation failed:", err);
    await db
      .update(message)
      .set({ processingStatus: "failed" })
      .where(eq(message.id, msgId));
  }
}

export const messagesRouter = router({
  list: authedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(50).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const participation = await ctx.db
        .select()
        .from(conversationParticipant)
        .where(
          and(
            eq(conversationParticipant.conversationId, input.conversationId),
            eq(conversationParticipant.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (participation.length === 0) {
        throw new Error("Not a participant");
      }

      const conditions = [eq(message.conversationId, input.conversationId)];

      if (input.cursor) {
        const cursorMsg = await ctx.db
          .select({ createdAt: message.createdAt })
          .from(message)
          .where(eq(message.id, input.cursor))
          .limit(1);

        if (cursorMsg.length > 0) {
          conditions.push(lt(message.createdAt, cursorMsg[0].createdAt));
        }
      }

      const messages = await ctx.db
        .select()
        .from(message)
        .where(and(...conditions))
        .orderBy(desc(message.createdAt))
        .limit(input.limit + 1);

      let nextCursor: string | undefined;
      if (messages.length > input.limit) {
        const next = messages.pop()!;
        nextCursor = next.id;
      }

      return {
        messages: messages.reverse(),
        nextCursor,
      };
    }),

  sendText: authedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        text: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const participation = await ctx.db
        .select()
        .from(conversationParticipant)
        .where(
          and(
            eq(conversationParticipant.conversationId, input.conversationId),
            eq(conversationParticipant.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (participation.length === 0) {
        throw new Error("Not a participant");
      }

      const msgId = nanoid();
      const now = new Date();

      await ctx.db.insert(message).values({
        id: msgId,
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        text: input.text,
        originalType: "text",
        processingStatus: "pending",
        createdAt: now,
      });

      await ctx.db
        .update(conversation)
        .set({ updatedAt: now })
        .where(eq(conversation.id, input.conversationId));

      const [newMessage] = await ctx.db
        .select()
        .from(message)
        .where(eq(message.id, msgId));

      // Notify immediately (text appears right away)
      const participantIds = await getConversationParticipantIds(
        ctx.db,
        input.conversationId
      );
      notifyAllParticipants(participantIds, {
        type: "new_message",
        conversationId: input.conversationId,
        messageId: msgId,
      });

      // Fire-and-forget TTS generation
      processTextToSpeech(
        ctx.db,
        ctx.storage,
        msgId,
        input.conversationId,
        input.text
      );

      return newMessage;
    }),

  sendVoice: authedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        audioBase64: z.string(),
        mimeType: z.string().default("audio/webm"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const participation = await ctx.db
        .select()
        .from(conversationParticipant)
        .where(
          and(
            eq(conversationParticipant.conversationId, input.conversationId),
            eq(conversationParticipant.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (participation.length === 0) {
        throw new Error("Not a participant");
      }

      const msgId = nanoid();
      const now = new Date();

      // Save audio file
      const ext = input.mimeType.includes("mp4") ? "m4a" : "webm";
      const filename = `${msgId}.${ext}`;
      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      const audioUrl = await ctx.storage.saveAudio(filename, audioBuffer);

      await ctx.db.insert(message).values({
        id: msgId,
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        audioUrl,
        originalType: "voice",
        processingStatus: "pending",
        createdAt: now,
      });

      await ctx.db
        .update(conversation)
        .set({ updatedAt: now })
        .where(eq(conversation.id, input.conversationId));

      const [newMessage] = await ctx.db
        .select()
        .from(message)
        .where(eq(message.id, msgId));

      // Notify immediately (audio playable right away)
      const participantIds = await getConversationParticipantIds(
        ctx.db,
        input.conversationId
      );
      notifyAllParticipants(participantIds, {
        type: "new_message",
        conversationId: input.conversationId,
        messageId: msgId,
      });

      // Fire-and-forget transcription
      processVoiceMessage(
        ctx.db,
        ctx.storage,
        msgId,
        input.conversationId,
        filename
      );

      return newMessage;
    }),
});
