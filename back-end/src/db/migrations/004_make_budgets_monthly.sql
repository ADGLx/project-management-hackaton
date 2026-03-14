ALTER TABLE user_monthly_budgets
ADD COLUMN IF NOT EXISTS month_start DATE;

UPDATE user_monthly_budgets
SET month_start = date_trunc('month', now())::date
WHERE month_start IS NULL;

ALTER TABLE user_monthly_budgets
ALTER COLUMN month_start SET NOT NULL;

ALTER TABLE user_monthly_budgets
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE user_monthly_budgets
DROP CONSTRAINT IF EXISTS user_monthly_budgets_pkey;

ALTER TABLE user_monthly_budgets
ADD CONSTRAINT user_monthly_budgets_pkey PRIMARY KEY (user_id, month_start);

DROP TRIGGER IF EXISTS user_monthly_budgets_set_updated_at ON user_monthly_budgets;

CREATE TRIGGER user_monthly_budgets_set_updated_at
BEFORE UPDATE ON user_monthly_budgets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
