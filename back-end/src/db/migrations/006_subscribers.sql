ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscribers BOOLEAN;

UPDATE users
SET subscribers = false
WHERE subscribers IS NULL;

ALTER TABLE users
ALTER COLUMN subscribers SET DEFAULT false,
ALTER COLUMN subscribers SET NOT NULL;
