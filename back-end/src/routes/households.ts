import { Router } from "express";
import { createHouseholdWithOwner, getUserHousehold, inviteUserToHouseholdByEmail, leaveUserHousehold } from "../db/households.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CreateHouseholdBody {
  name?: unknown;
}

interface InviteBody {
  email?: unknown;
}

function parseName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 80) {
    return null;
  }

  return trimmed;
}

function parseHouseholdId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function parseInviteEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

router.get("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const household = await getUserHousehold(String(req.auth.userId));
    res.json({ household });
  } catch {
    res.status(500).json({ message: "Failed to load household" });
  }
});

router.post("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const body = (req.body ?? {}) as CreateHouseholdBody;
  const name = parseName(body.name);

  if (!name) {
    res.status(400).json({ message: "Household name is required (max 80 characters)" });
    return;
  }

  try {
    const household = await createHouseholdWithOwner(String(req.auth.userId), name);
    res.status(201).json({ household });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "USER_ALREADY_IN_HOUSEHOLD") {
      res.status(409).json({ message: "You are already in a household" });
      return;
    }

    res.status(500).json({ message: "Failed to create household" });
  }
});

router.post("/:householdId/invite", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const householdId = parseHouseholdId(req.params.householdId);
  const body = (req.body ?? {}) as InviteBody;
  const email = parseInviteEmail(body.email);

  if (!householdId) {
    res.status(400).json({ message: "Household id is required" });
    return;
  }

  if (!email) {
    res.status(400).json({ message: "Please provide a valid registered email" });
    return;
  }

  try {
    const household = await inviteUserToHouseholdByEmail(String(req.auth.userId), householdId, email);
    res.json({ household });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const postgresErrorCode = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";

    if (message === "HOUSEHOLD_NOT_FOUND") {
      res.status(404).json({ message: "Household not found" });
      return;
    }

    if (message === "REQUESTER_NOT_IN_HOUSEHOLD") {
      res.status(403).json({ message: "You can only invite users to your own household" });
      return;
    }

    if (message === "REQUESTER_NOT_CREATOR") {
      res.status(403).json({ message: "Only the household creator can invite members" });
      return;
    }

    if (message === "INVITEE_NOT_FOUND") {
      res.status(404).json({ message: "No registered user matches that email" });
      return;
    }

    if (message === "INVITEE_ALREADY_IN_HOUSEHOLD") {
      res.status(409).json({ message: "This user is already in a household" });
      return;
    }

    if (message === "INVITEE_ALREADY_INVITED" || postgresErrorCode === "23505") {
      res.status(409).json({ message: "This user already has a pending invite" });
      return;
    }

    res.status(500).json({ message: "Failed to invite user" });
  }
});

router.delete("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const result = await leaveUserHousehold(String(req.auth.userId));

    if (result === "NOT_IN_HOUSEHOLD") {
      res.status(404).json({ message: "You are not in a household" });
      return;
    }

    if (result === "CREATOR_WITH_OTHER_MEMBERS") {
      res.status(409).json({ message: "Creator cannot leave while other members are still in the household" });
      return;
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Failed to leave household" });
  }
});

export default router;
