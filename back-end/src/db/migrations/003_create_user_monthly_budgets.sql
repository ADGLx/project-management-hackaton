CREATE TABLE IF NOT EXISTS user_monthly_budgets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  budget_amount_cad INTEGER NOT NULL CHECK (budget_amount_cad > 0)
);
