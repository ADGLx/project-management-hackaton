import type { AuthTokenClaims } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenClaims;
    }
  }
}

export {};
