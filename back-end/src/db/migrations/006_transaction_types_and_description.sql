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

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

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
