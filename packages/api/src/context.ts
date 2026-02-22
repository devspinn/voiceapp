import type { Database } from "@voiceapp/db";
import type { Auth } from "@voiceapp/auth";
import type { StorageService } from "./services/storage.js";

export interface AppContext {
  db: Database;
  auth: Auth;
  storage: StorageService;
}

export interface AuthedContext extends AppContext {
  user: { id: string; name: string; email: string };
}
