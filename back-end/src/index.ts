import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import authRouter from "./routes/auth.js";
import budgetRouter from "./routes/budget.js";
import householdFinancesRouter from "./routes/householdFinances.js";
import householdsRouter from "./routes/households.js";
import transactionTypesRouter from "./routes/transactionTypes.js";
import transactionsRouter from "./routes/transactions.js";
import { runMigrations } from "./db/migrate.js";
import { pool } from "./db/pool.js";

const app = express();

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", async (_req, res) => {
  try {
    const result = await pool.query<{ now: Date }>("SELECT NOW() as now");
    res.json({
      status: "ok",
      database: "connected",
      now: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: getErrorMessage(error),
    });
  }
});

app.get("/", (_req, res) => {
  res.json({ message: "Backend running" });
});

app.use("/auth", authRouter);
app.use("/budget", budgetRouter);
app.use("/households", householdsRouter);
app.use("/household-finances", householdFinancesRouter);
app.use("/transactions", transactionsRouter);
app.use("/transaction-types", transactionTypesRouter);

async function startServer() {
  try {
    await runMigrations();
    await pool.query("SELECT 1");

    app.listen(env.port, () => {
      console.log(`Backend listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start backend", error);
    process.exit(1);
  }
}

void startServer();
