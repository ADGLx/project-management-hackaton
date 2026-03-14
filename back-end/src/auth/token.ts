import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthTokenClaims } from "../types/auth.js";

const TOKEN_COOKIE = "pmh_token";

export function signAuthToken(payload: AuthTokenClaims): string {
  const expiresIn = env.jwtExpiresIn as jwt.SignOptions["expiresIn"];

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn,
  });
}

export function verifyAuthToken(token: string): AuthTokenClaims {
  const payload = jwt.verify(token, env.jwtSecret);

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.userId !== "string" ||
    typeof payload.email !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    userId: payload.userId,
    email: payload.email,
  };
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    maxAge: env.cookieMaxAgeMs,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(TOKEN_COOKIE, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
  });
}

export function readTokenFromRequest(req: Request): string | null {
  return req.cookies?.[TOKEN_COOKIE] ?? null;
}
