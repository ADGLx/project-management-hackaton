CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cad DOUBLE PRECISION NOT NULL CHECK (amount_cad > 0),
  type TEXT NOT NULL CHECK (btrim(type) <> ''),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions (user_id, transaction_date DESC);

DROP TRIGGER IF EXISTS transactions_set_updated_at ON transactions;

CREATE TRIGGER transactions_set_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
