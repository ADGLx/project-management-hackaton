import { Router } from "express";
import {
  createMyHouseholdTransaction,
  deleteMyHouseholdTransaction,
  getMyHouseholdSettlementSummary,
  getMyHouseholdTransactions,
  updateMyHouseholdTransaction,
} from "../db/householdFinances.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

interface SaveTransactionBody {
  amountCad?: unknown;
  type?: unknown;
  description?: unknown;
  transactionDate?: unknown;
  participantUserIds?: unknown;
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

function parseTextField(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
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

function parseTransactionId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function parseParticipantUserIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);

  if (normalized.length === 0) {
    return null;
  }

  return Array.from(new Set(normalized));
}

function parseMonth(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

router.get("/transactions/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const transactions = await getMyHouseholdTransactions(String(req.auth.userId));
    res.json({ transactions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "USER_NOT_IN_HOUSEHOLD") {
      res.status(404).json({ message: "You are not in a household" });
      return;
    }

    res.status(500).json({ message: "Failed to load household transactions" });
  }
});

router.get("/settlements/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const queryMonth = parseMonth(req.query.month);
  const month = queryMonth === undefined ? new Date().toISOString().slice(0, 7) : queryMonth;

  if (!month) {
    res.status(400).json({ message: "Month must be in YYYY-MM format" });
    return;
  }

  try {
    const summary = await getMyHouseholdSettlementSummary(String(req.auth.userId), month);
    res.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "USER_NOT_IN_HOUSEHOLD") {
      res.status(404).json({ message: "You are not in a household" });
      return;
    }

    if (message === "INVALID_MONTH") {
      res.status(400).json({ message: "Month must be in YYYY-MM format" });
      return;
    }

    res.status(500).json({ message: "Failed to load household settlements" });
  }
});

router.post("/transactions/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const body = (req.body ?? {}) as SaveTransactionBody;
  const amountCad = parseAmount(body.amountCad);
  const type = parseTextField(body.type);
  const description = parseTextField(body.description);
  const transactionDate = parseTransactionDate(body.transactionDate);
  const participantUserIds = parseParticipantUserIds(body.participantUserIds);

  if (amountCad === null) {
    res.status(400).json({ message: "Amount must be a positive number" });
    return;
  }

  if (!type) {
    res.status(400).json({ message: "Type is required" });
    return;
  }

  if (!description) {
    res.status(400).json({ message: "Description is required" });
    return;
  }

  if (!transactionDate) {
    res.status(400).json({ message: "Transaction date must be in YYYY-MM-DD format" });
    return;
  }

  if (!participantUserIds) {
    res.status(400).json({ message: "Please select at least one household member" });
    return;
  }

  try {
    const transaction = await createMyHouseholdTransaction(
      String(req.auth.userId),
      amountCad,
      type,
      description,
      transactionDate,
      participantUserIds,
      true,
    );
    res.status(201).json({ transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "USER_NOT_IN_HOUSEHOLD") {
      res.status(404).json({ message: "You are not in a household" });
      return;
    }

    if (message === "PARTICIPANTS_REQUIRED") {
      res.status(400).json({ message: "Please select at least one household member" });
      return;
    }

    if (message === "PARTICIPANTS_MUST_BE_HOUSEHOLD_MEMBERS") {
      res.status(400).json({ message: "All selected participants must belong to your household" });
      return;
    }

    res.status(500).json({ message: "Failed to save household transaction" });
  }
});

router.put("/transactions/me/:transactionId", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const transactionId = parseTransactionId(req.params.transactionId);
  const body = (req.body ?? {}) as SaveTransactionBody;
  const amountCad = parseAmount(body.amountCad);
  const type = parseTextField(body.type);
  const description = parseTextField(body.description);
  const transactionDate = parseTransactionDate(body.transactionDate);
  const participantUserIds = parseParticipantUserIds(body.participantUserIds);

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

  if (!description) {
    res.status(400).json({ message: "Description is required" });
    return;
  }

  if (!transactionDate) {
    res.status(400).json({ message: "Transaction date must be in YYYY-MM-DD format" });
    return;
  }

  if (!participantUserIds) {
    res.status(400).json({ message: "Please select at least one household member" });
    return;
  }

  try {
    const transaction = await updateMyHouseholdTransaction(
      String(req.auth.userId),
      transactionId,
      amountCad,
      type,
      description,
      transactionDate,
      participantUserIds,
    );

    if (!transaction) {
      res.status(404).json({ message: "Transaction not found" });
      return;
    }

    res.json({ transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "USER_NOT_IN_HOUSEHOLD") {
      res.status(404).json({ message: "You are not in a household" });
      return;
    }

    if (message === "PARTICIPANTS_REQUIRED") {
      res.status(400).json({ message: "Please select at least one household member" });
      return;
    }

    if (message === "PARTICIPANTS_MUST_BE_HOUSEHOLD_MEMBERS") {
      res.status(400).json({ message: "All selected participants must belong to your household" });
      return;
    }

    res.status(500).json({ message: "Failed to update household transaction" });
  }
});

router.delete("/transactions/me/:transactionId", requireAuth, async (req, res) => {
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
    const deleted = await deleteMyHouseholdTransaction(String(req.auth.userId), transactionId);

    if (!deleted) {
      res.status(404).json({ message: "Transaction not found" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "USER_NOT_IN_HOUSEHOLD") {
      res.status(404).json({ message: "You are not in a household" });
      return;
    }

    res.status(500).json({ message: "Failed to delete household transaction" });
  }
});

export default router;
