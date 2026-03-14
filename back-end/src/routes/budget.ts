import { Router } from "express";
import { getUserMonthlyBudget, getUserMonthlyBudgetHistory, upsertUserMonthlyBudget } from "../db/budgets.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

interface SaveBudgetBody {
  budgetAmountCad?: unknown;
}

function parseBudgetAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  if (value <= 0) {
    return null;
  }

  return value;
}

router.get("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const budgetAmountCad = await getUserMonthlyBudget(String(req.auth.userId));
    res.json({ budgetAmountCad });
  } catch {
    res.status(500).json({ message: "Failed to load monthly budget" });
  }
});

router.post("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const { budgetAmountCad } = (req.body ?? {}) as SaveBudgetBody;
  const parsedBudgetAmountCad = parseBudgetAmount(budgetAmountCad);

  if (parsedBudgetAmountCad === null) {
    res.status(400).json({ message: "Budget amount must be an integer greater than 0" });
    return;
  }

  try {
    const savedBudgetAmountCad = await upsertUserMonthlyBudget(String(req.auth.userId), parsedBudgetAmountCad);
    res.json({ budgetAmountCad: savedBudgetAmountCad });
  } catch {
    res.status(500).json({ message: "Failed to save monthly budget" });
  }
});

router.get("/history", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const history = await getUserMonthlyBudgetHistory(String(req.auth.userId));
    res.json({ history });
  } catch {
    res.status(500).json({ message: "Failed to load budget history" });
  }
});

export default router;
