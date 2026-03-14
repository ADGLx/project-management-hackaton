CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE users
SET name = split_part(email, '@', 1)
WHERE name IS NULL OR btrim(name) = '';

ALTER TABLE users
ALTER COLUMN name SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (lower(email));

DROP TRIGGER IF EXISTS users_set_updated_at ON users;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS user_monthly_budgets (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  budget_amount_cad INTEGER NOT NULL CHECK (budget_amount_cad > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month_start)
);

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

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cad DOUBLE PRECISION NOT NULL CHECK (amount_cad > 0),
  type TEXT NOT NULL CHECK (btrim(type) <> ''),
  description TEXT NOT NULL CHECK (btrim(description) <> ''),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE transactions
SET description = type
WHERE description IS NULL OR btrim(description) = '';

ALTER TABLE transactions
ALTER COLUMN description SET NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions (user_id, transaction_date DESC);

DROP TRIGGER IF EXISTS transactions_set_updated_at ON transactions;

CREATE TRIGGER transactions_set_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS user_transaction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_transaction_types_user_name_unique_idx ON user_transaction_types (user_id, lower(name));

DROP TRIGGER IF EXISTS user_transaction_types_set_updated_at ON user_transaction_types;

CREATE TRIGGER user_transaction_types_set_updated_at
BEFORE UPDATE ON user_transaction_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE OR REPLACE FUNCTION ensure_default_transaction_types_on_user_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_transaction_types (user_id, name)
  VALUES
    (NEW.id, 'Food'),
    (NEW.id, 'Transport'),
    (NEW.id, 'Housing'),
    (NEW.id, 'Utilities'),
    (NEW.id, 'Health'),
    (NEW.id, 'Entertainment'),
    (NEW.id, 'Shopping'),
    (NEW.id, 'Education'),
    (NEW.id, 'Travel')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_ensure_default_transaction_types ON users;

CREATE TRIGGER users_ensure_default_transaction_types
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION ensure_default_transaction_types_on_user_insert();

INSERT INTO user_transaction_types (user_id, name)
SELECT users.id, default_types.name
FROM users
CROSS JOIN (
  VALUES
    ('Food'),
    ('Transport'),
    ('Housing'),
    ('Utilities'),
    ('Health'),
    ('Entertainment'),
    ('Shopping'),
    ('Education'),
    ('Travel')
) AS default_types(name)
ON CONFLICT DO NOTHING;
