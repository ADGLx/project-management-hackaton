import { Router } from "express";
import { createUserTransactionType, deleteUserTransactionType, getUserTransactionTypes } from "../db/transactionTypes.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

interface CreateTransactionTypeBody {
  name?: unknown;
}

function parseName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function parseTypeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

router.get("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const transactionTypes = await getUserTransactionTypes(String(req.auth.userId));
    res.json({ transactionTypes });
  } catch {
    res.status(500).json({ message: "Failed to load transaction types" });
  }
});

router.post("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const body = (req.body ?? {}) as CreateTransactionTypeBody;
  const name = parseName(body.name);

  if (!name) {
    res.status(400).json({ message: "Type name is required" });
    return;
  }

  try {
    const transactionType = await createUserTransactionType(String(req.auth.userId), name);
    res.status(201).json({ transactionType });
  } catch (error) {
    const postgresErrorCode = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";

    if (postgresErrorCode === "23505") {
      res.status(409).json({ message: "Type already exists" });
      return;
    }

    res.status(500).json({ message: "Failed to create type" });
  }
});

router.delete("/me/:typeId", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const typeId = parseTypeId(req.params.typeId);

  if (!typeId) {
    res.status(400).json({ message: "Type id is required" });
    return;
  }

  try {
    const deleted = await deleteUserTransactionType(String(req.auth.userId), typeId);

    if (!deleted) {
      res.status(404).json({ message: "Type not found" });
      return;
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Failed to delete type" });
  }
});

export default router;
