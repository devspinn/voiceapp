import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

export interface StorageService {
  saveAudio(filename: string, data: Buffer): Promise<string>;
  getAudioPath(filename: string): string;
}

export function createLocalStorage(): StorageService {
  return {
    async saveAudio(filename: string, data: Buffer): Promise<string> {
      await mkdir(UPLOADS_DIR, { recursive: true });
      const filePath = path.join(UPLOADS_DIR, filename);
      await writeFile(filePath, data);
      return `/uploads/${filename}`;
    },

    getAudioPath(filename: string): string {
      return path.join(UPLOADS_DIR, filename);
    },
  };
}
