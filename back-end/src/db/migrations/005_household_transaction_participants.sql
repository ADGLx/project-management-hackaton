CREATE TABLE IF NOT EXISTS household_transaction_participants (
  transaction_id UUID NOT NULL REFERENCES household_transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (transaction_id, user_id)
);

CREATE INDEX IF NOT EXISTS household_transaction_participants_user_idx ON household_transaction_participants (user_id);
