import type { NextFunction, Request, Response } from "express";
import { readTokenFromRequest, verifyAuthToken } from "../auth/token.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readTokenFromRequest(req);

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.auth = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
