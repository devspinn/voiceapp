import OpenAI from "openai";
import { createReadStream } from "fs";
import type { StorageService } from "./storage.js";

let openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export async function transcribeAudio(filePath: string): Promise<string> {
  const client = getClient();
  const transcription = await client.audio.transcriptions.create({
    model: "whisper-1",
    file: createReadStream(filePath),
  });
  return transcription.text;
}

export async function generateSpeech(
  text: string,
  storage: StorageService,
  filename: string
): Promise<string> {
  const client = getClient();
  const response = await client.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: text,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const audioUrl = await storage.saveAudio(filename, buffer);
  return audioUrl;
}
