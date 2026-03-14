CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('household_invite')),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS alerts_user_created_idx ON alerts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_user_status_created_idx ON alerts (user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS alerts_household_pending_unique_idx
ON alerts (user_id, household_id, kind)
WHERE status = 'pending';
