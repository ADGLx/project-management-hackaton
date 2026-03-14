CREATE TABLE IF NOT EXISTS household_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cad DOUBLE PRECISION NOT NULL CHECK (amount_cad > 0),
  type TEXT NOT NULL CHECK (btrim(type) <> ''),
  description TEXT NOT NULL CHECK (btrim(description) <> ''),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS household_transactions_household_date_idx ON household_transactions (household_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS household_transactions_created_by_idx ON household_transactions (created_by_user_id);

DROP TRIGGER IF EXISTS household_transactions_set_updated_at ON household_transactions;

CREATE TRIGGER household_transactions_set_updated_at
BEFORE UPDATE ON household_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
