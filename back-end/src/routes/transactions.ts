import { Router } from "express";
import multer from "multer";
import OpenAI from "openai";
import { env } from "../config/env.js";
import { getUserTransactionTypes } from "../db/transactionTypes.js";
import { findUserById } from "../db/users.js";
import {
  createUserTransaction,
  deleteUserTransaction,
  getUserMonthlySpendingHistory,
  getUserTransactions,
  updateUserTransaction,
} from "../db/transactions.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image files are supported"));
      return;
    }

    callback(null, true);
  },
}).single("receiptImage");

let openAiClient: OpenAI | null = null;

interface SaveTransactionBody {
  amountCad?: unknown;
  type?: unknown;
  description?: unknown;
  transactionDate?: unknown;
}

interface ReceiptSuggestion {
  amountCad: number;
  type: string;
  description: string;
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

function getOpenAiClient(): OpenAI | null {
  if (!env.openaiApiKey) {
    return null;
  }

  if (!openAiClient) {
    openAiClient = new OpenAI({ apiKey: env.openaiApiKey });
  }

  return openAiClient;
}

function parseReceiptSuggestion(rawContent: string): ReceiptSuggestion | null {
  const directCandidate = rawContent.trim();
  const objectCandidateMatch = directCandidate.match(/\{[\s\S]*\}/);
  const jsonCandidate = objectCandidateMatch ? objectCandidateMatch[0] : directCandidate;

  try {
    const parsed = JSON.parse(jsonCandidate) as Partial<ReceiptSuggestion>;

    if (typeof parsed.amountCad !== "number" || !Number.isFinite(parsed.amountCad) || parsed.amountCad <= 0) {
      return null;
    }

    if (typeof parsed.type !== "string" || !parsed.type.trim()) {
      return null;
    }

    if (typeof parsed.description !== "string" || !parsed.description.trim()) {
      return null;
    }

    return {
      amountCad: Number(parsed.amountCad.toFixed(2)),
      type: parsed.type.trim(),
      description: parsed.description.trim().slice(0, 120),
    };
  } catch {
    return null;
  }
}

function pickAllowedType(candidateType: string, allowedTypes: string[]): string | null {
  const exactMatch = allowedTypes.find((typeName) => typeName === candidateType);

  if (exactMatch) {
    return exactMatch;
  }

  const candidateLower = candidateType.toLowerCase();
  return allowedTypes.find((typeName) => typeName.toLowerCase() === candidateLower) ?? null;
}

router.post("/me/ocr", requireAuth, (req, res) => {
  if (!req.auth) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  void (async () => {
    const user = await findUserById(String(req.auth?.userId));

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    if (!user.subscribers) {
      res.status(403).json({ message: "Receipt scanning is available to subscribers only" });
      return;
    }

    receiptUpload(req, res, async (uploadError: unknown) => {
      if (uploadError instanceof multer.MulterError) {
        if (uploadError.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ message: "Image is too large. Please upload up to 6MB." });
          return;
        }

        res.status(400).json({ message: "Invalid image upload" });
        return;
      }

      if (uploadError) {
        const message = uploadError instanceof Error && uploadError.message ? uploadError.message : "Invalid image upload";
        res.status(400).json({ message });
        return;
      }

      const file = req.file;

      if (!file) {
        res.status(400).json({ message: "Receipt image is required" });
        return;
      }

      if (!file.buffer.length) {
        res.status(400).json({ message: "Uploaded image is empty" });
        return;
      }

      const client = getOpenAiClient();

      if (!client) {
        res.status(500).json({ message: "OCR is not configured on the server" });
        return;
      }

      try {
        const userId = String(req.auth?.userId);
        const transactionTypes = await getUserTransactionTypes(userId);
        const allowedTypes = transactionTypes.map((transactionType) => transactionType.name);

        if (allowedTypes.length === 0) {
          res.status(400).json({ message: "No transaction types found. Add one in your user page first." });
          return;
        }

        const imageDataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

        const completion = await client.chat.completions.create({
          model: env.openaiVisionModel,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You read receipt images and return structured data. Reply with JSON only and no markdown. Return exactly this shape: {\"amountCad\": number, \"type\": string, \"description\": string }.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract the main total amount from this receipt, choose one type from this list, and write a short description (2-6 words). Allowed types: ${allowedTypes.join(", ")}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataUrl,
                  },
                },
              ],
            },
          ],
        });

        const rawContent = completion.choices[0]?.message?.content;

        if (!rawContent) {
          res.status(502).json({ message: "OCR provider returned an empty response" });
          return;
        }

        const parsedSuggestion = parseReceiptSuggestion(rawContent);

        if (!parsedSuggestion) {
          res.status(422).json({ message: "Could not extract receipt details. Please try another photo." });
          return;
        }

        const allowedType = pickAllowedType(parsedSuggestion.type, allowedTypes);

        if (!allowedType) {
          res.status(422).json({ message: "Could not match receipt to your transaction types." });
          return;
        }

        res.json({
          suggestion: {
            amountCad: parsedSuggestion.amountCad,
            type: allowedType,
            description: parsedSuggestion.description,
          },
        });
      } catch {
        res.status(500).json({ message: "Failed to scan receipt" });
      }
    });
  })().catch(() => {
    res.status(500).json({ message: "Failed to scan receipt" });
  });
});

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
