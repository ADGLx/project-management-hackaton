import type { AuthResponseBody, AuthResult, User } from "../types/auth";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Request failed";
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, { credentials: "include" });

    if (!response.ok) {
      return null;
    }

    const data = await readJson<AuthResponseBody>(response);
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export async function sendAuthRequest(path: "/auth/login" | "/auth/register", payload: Record<string, string>): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await readJson<AuthResponseBody>(response);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.message ?? "Request failed",
      };
    }

    if (!data?.user) {
      return {
        ok: false,
        message: "Server returned an invalid auth response",
      };
    }

    return {
      ok: true,
      user: data.user,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

export async function logoutRequest(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
