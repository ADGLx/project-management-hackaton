import { pool } from "./pool.js";

interface BudgetHistoryRow {
  month_start: string;
  budget_amount_cad: number;
}

export interface MonthlyBudgetPoint {
  monthStart: string;
  budgetAmountCad: number;
}

export async function getUserMonthlyBudget(userId: string): Promise<number | null> {
  const query = `
    SELECT budget_amount_cad
    FROM user_monthly_budgets
    WHERE user_id = $1
      AND month_start = date_trunc('month', now())::date
    LIMIT 1
  `;

  const result = await pool.query<{ budget_amount_cad: number }>(query, [userId]);
  return result.rows[0]?.budget_amount_cad ?? null;
}

export async function upsertUserMonthlyBudget(userId: string, budgetAmountCad: number): Promise<number> {
  const query = `
    INSERT INTO user_monthly_budgets (user_id, month_start, budget_amount_cad)
    VALUES ($1, date_trunc('month', now())::date, $2)
    ON CONFLICT (user_id, month_start)
    DO UPDATE SET budget_amount_cad = EXCLUDED.budget_amount_cad
    RETURNING budget_amount_cad
  `;

  const result = await pool.query<{ budget_amount_cad: number }>(query, [userId, budgetAmountCad]);
  return result.rows[0].budget_amount_cad;
}

export async function getUserMonthlyBudgetHistory(userId: string, limit = 12): Promise<MonthlyBudgetPoint[]> {
  const query = `
    SELECT month_start::text, budget_amount_cad
    FROM user_monthly_budgets
    WHERE user_id = $1
    ORDER BY month_start ASC
    LIMIT $2
  `;

  const result = await pool.query<BudgetHistoryRow>(query, [userId, limit]);

  return result.rows.map((row) => ({
    monthStart: row.month_start,
    budgetAmountCad: row.budget_amount_cad,
  }));
}
