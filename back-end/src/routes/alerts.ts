import { Router } from "express";
import { getUserAlerts, respondToHouseholdInviteAlert } from "../db/alerts.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

interface AlertResponseBody {
  decision?: unknown;
}

function parseAlertId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function parseDecision(value: unknown): "accept" | "decline" | null {
  if (value === "accept" || value === "decline") {
    return value;
  }

  return null;
}

router.get("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const alerts = await getUserAlerts(String(req.auth.userId));
    res.json({ alerts });
  } catch {
    res.status(500).json({ message: "Failed to load alerts" });
  }
});

router.post("/:alertId/respond", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const alertId = parseAlertId(req.params.alertId);
  const body = (req.body ?? {}) as AlertResponseBody;
  const decision = parseDecision(body.decision);
  const userId = String(req.auth.userId);

  if (!alertId) {
    res.status(400).json({ message: "Alert id is required" });
    return;
  }

  if (!decision) {
    res.status(400).json({ message: "Decision must be 'accept' or 'decline'" });
    return;
  }

  try {
    const alert = await respondToHouseholdInviteAlert(userId, alertId, decision);
    res.json({ alert });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const postgresErrorCode = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";

    if (message === "ALERT_NOT_FOUND") {
      res.status(404).json({ message: "Alert not found" });
      return;
    }

    if (message === "ALERT_FORBIDDEN") {
      res.status(403).json({ message: "You can only respond to your own alerts" });
      return;
    }

    if (message === "ALERT_ALREADY_RESPONDED") {
      res.status(409).json({ message: "This invite has already been handled" });
      return;
    }

    if (message === "HOUSEHOLD_NOT_FOUND") {
      res.status(404).json({ message: "This household no longer exists" });
      return;
    }

    if (message === "USER_ALREADY_IN_HOUSEHOLD" || postgresErrorCode === "23505") {
      res.status(409).json({ message: "You are already in a household" });
      return;
    }

    res.status(500).json({ message: "Failed to respond to invite" });
  }
});

export default router;
