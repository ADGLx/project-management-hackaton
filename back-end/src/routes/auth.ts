import bcrypt from "bcryptjs";
import { Router } from "express";
import { clearAuthCookie, setAuthCookie, signAuthToken } from "../auth/token.js";
import { createUser, findUserByEmail, findUserById, updateUserSubscription } from "../db/users.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const MIN_PASSWORD_LENGTH = 8;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginBody {
  email?: string;
  password?: string;
}

interface RegisterBody extends LoginBody {
  name?: string;
}

interface SubscriptionBody {
  subscribers?: boolean;
}

function validateEmailPassword(email?: string, password?: string): string | null {
  if (!email || !password) {
    return "Email and password are required";
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "Please provide a valid email address";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  return null;
}

function validateRegistration(name: string | undefined, email: string | undefined, password: string | undefined): string | null {
  if (!name) {
    return "Name is required";
  }

  const normalizedName = String(name).trim();

  if (normalizedName.length < MIN_NAME_LENGTH) {
    return `Name must be at least ${MIN_NAME_LENGTH} characters`;
  }

  if (normalizedName.length > MAX_NAME_LENGTH) {
    return `Name must be at most ${MAX_NAME_LENGTH} characters`;
  }

  return validateEmailPassword(email, password);
}

router.post("/register", async (req, res) => {
  const { name, email, password } = (req.body ?? {}) as RegisterBody;
  const validationError = validateRegistration(name, email, password);

  if (validationError) {
    res.status(400).json({ message: validationError });
    return;
  }

  if (!name || !email || !password) {
    res.status(400).json({ message: "Invalid registration payload" });
    return;
  }

  try {
    const safeName = name.trim();
    const safeEmail = email.toLowerCase();
    const safePassword = password;

    const existing = await findUserByEmail(safeEmail);

    if (existing) {
      res.status(409).json({ message: "Email is already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(safePassword, 12);
    const user = await createUser(safeName, safeEmail, passwordHash);

    const token = signAuthToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);

    res.status(201).json({ user });
  } catch {
    res.status(500).json({ message: "Failed to register user" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = (req.body ?? {}) as LoginBody;
  const validationError = validateEmailPassword(email, password);

  if (validationError) {
    res.status(400).json({ message: validationError });
    return;
  }

  if (!email || !password) {
    res.status(400).json({ message: "Invalid login payload" });
    return;
  }

  try {
    const safeEmail = email.toLowerCase();
    const safePassword = password;

    const user = await findUserByEmail(safeEmail);

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isValidPassword = await bcrypt.compare(safePassword, user.password_hash);

    if (!isValidPassword) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token = signAuthToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subscribers: user.subscribers,
        created_at: user.created_at,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to login" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const user = await findUserById(req.auth.userId);

    if (!user) {
      clearAuthCookie(res);
      res.status(401).json({ message: "User not found" });
      return;
    }

    res.json({ user });
  } catch {
    res.status(500).json({ message: "Failed to load user" });
  }
});

router.patch("/me/subscription", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const { subscribers } = (req.body ?? {}) as SubscriptionBody;

  if (typeof subscribers !== "boolean") {
    res.status(400).json({ message: "subscribers must be a boolean" });
    return;
  }

  try {
    const user = await updateUserSubscription(req.auth.userId, subscribers);

    if (!user) {
      clearAuthCookie(res);
      res.status(401).json({ message: "User not found" });
      return;
    }

    res.json({ user });
  } catch {
    res.status(500).json({ message: "Failed to update subscription" });
  }
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

export default router;
