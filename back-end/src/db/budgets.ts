import { pool } from "./pool.js";

export async function getUserMonthlyBudget(userId: string): Promise<number | null> {
  const query = `
    SELECT budget_amount_cad
    FROM user_monthly_budgets
    WHERE user_id = $1
    LIMIT 1
  `;

  const result = await pool.query<{ budget_amount_cad: number }>(query, [userId]);
  return result.rows[0]?.budget_amount_cad ?? null;
}

export async function upsertUserMonthlyBudget(userId: string, budgetAmountCad: number): Promise<number> {
  const query = `
    INSERT INTO user_monthly_budgets (user_id, budget_amount_cad)
    VALUES ($1, $2)
    ON CONFLICT (user_id)
    DO UPDATE SET budget_amount_cad = EXCLUDED.budget_amount_cad
    RETURNING budget_amount_cad
  `;

  const result = await pool.query<{ budget_amount_cad: number }>(query, [userId, budgetAmountCad]);
  return result.rows[0].budget_amount_cad;
}
