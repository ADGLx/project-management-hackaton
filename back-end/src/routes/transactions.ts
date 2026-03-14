import { Router } from "express";
import {
  createUserTransaction,
  deleteUserTransaction,
  getUserMonthlySpendingHistory,
  getUserTransactions,
  updateUserTransaction,
} from "../db/transactions.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

interface SaveTransactionBody {
  amountCad?: unknown;
  type?: unknown;
  description?: unknown;
  transactionDate?: unknown;
}

function parseAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value <= 0) {
    return null;
  }

  return value;
}

function parseType(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function parseTransactionDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (parsed.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return value;
}

function parseDescription(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function parseTransactionId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

router.post("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const body = (req.body ?? {}) as SaveTransactionBody;
  const amountCad = parseAmount(body.amountCad);
  const type = parseType(body.type);
  const description = parseDescription(body.description);
  const transactionDate = parseTransactionDate(body.transactionDate);

  if (amountCad === null) {
    res.status(400).json({ message: "Amount must be a positive number" });
    return;
  }

  if (!type) {
    res.status(400).json({ message: "Type is required" });
    return;
  }

  if (!transactionDate) {
    res.status(400).json({ message: "Transaction date must be in YYYY-MM-DD format" });
    return;
  }

  if (!description) {
    res.status(400).json({ message: "Description is required" });
    return;
  }

  try {
    const transaction = await createUserTransaction(String(req.auth.userId), amountCad, type, description, transactionDate);
    res.status(201).json({ transaction });
  } catch {
    res.status(500).json({ message: "Failed to save transaction" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const transactions = await getUserTransactions(String(req.auth.userId));
    res.json({ transactions });
  } catch {
    res.status(500).json({ message: "Failed to load transactions" });
  }
});

router.put("/me/:transactionId", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const transactionId = parseTransactionId(req.params.transactionId);
  const body = (req.body ?? {}) as SaveTransactionBody;
  const amountCad = parseAmount(body.amountCad);
  const type = parseType(body.type);
  const description = parseDescription(body.description);
  const transactionDate = parseTransactionDate(body.transactionDate);

  if (!transactionId) {
    res.status(400).json({ message: "Transaction id is required" });
    return;
  }

  if (amountCad === null) {
    res.status(400).json({ message: "Amount must be a positive number" });
    return;
  }

  if (!type) {
    res.status(400).json({ message: "Type is required" });
    return;
  }

  if (!transactionDate) {
    res.status(400).json({ message: "Transaction date must be in YYYY-MM-DD format" });
    return;
  }

  if (!description) {
    res.status(400).json({ message: "Description is required" });
    return;
  }

  try {
    const transaction = await updateUserTransaction(String(req.auth.userId), transactionId, amountCad, type, description, transactionDate);

    if (!transaction) {
      res.status(404).json({ message: "Transaction not found" });
      return;
    }

    res.json({ transaction });
  } catch {
    res.status(500).json({ message: "Failed to update transaction" });
  }
});

router.delete("/me/:transactionId", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const transactionId = parseTransactionId(req.params.transactionId);

  if (!transactionId) {
    res.status(400).json({ message: "Transaction id is required" });
    return;
  }

  try {
    const deleted = await deleteUserTransaction(String(req.auth.userId), transactionId);

    if (!deleted) {
      res.status(404).json({ message: "Transaction not found" });
      return;
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Failed to delete transaction" });
  }
});

router.get("/history", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const history = await getUserMonthlySpendingHistory(String(req.auth.userId));
    res.json({ history });
  } catch {
    res.status(500).json({ message: "Failed to load transaction history" });
  }
});

export default router;
