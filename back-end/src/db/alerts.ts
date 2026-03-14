import { pool } from "./pool.js";

interface AlertRow {
  id: string;
  user_id: string;
  kind: "household_invite";
  household_id: string | null;
  household_name: string | null;
  invited_by_user_id: string | null;
  invited_by_name: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
}

interface AlertLockRow {
  id: string;
  user_id: string;
  kind: "household_invite";
  household_id: string | null;
  invited_by_user_id: string | null;
  status: "pending" | "accepted" | "declined";
}

export type AlertDecision = "accept" | "decline";

export interface Alert {
  id: string;
  kind: "household_invite";
  householdId: string | null;
  householdName: string | null;
  invitedByUserId: string | null;
  invitedByName: string | null;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt: string | null;
}

function toAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    kind: row.kind,
    householdId: row.household_id,
    householdName: row.household_name,
    invitedByUserId: row.invited_by_user_id,
    invitedByName: row.invited_by_name,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

async function getAlertByIdForUser(alertId: string, userId: string): Promise<Alert | null> {
  const query = `
    SELECT
      a.id,
      a.user_id,
      a.kind,
      a.household_id,
      h.name AS household_name,
      a.invited_by_user_id,
      inviter.name AS invited_by_name,
      a.status,
      a.created_at,
      a.responded_at
    FROM alerts a
    LEFT JOIN households h ON h.id = a.household_id
    LEFT JOIN users inviter ON inviter.id = a.invited_by_user_id
    WHERE a.id = $1 AND a.user_id = $2
    LIMIT 1
  `;

  const result = await pool.query<AlertRow>(query, [alertId, userId]);
  const row = result.rows[0];
  return row ? toAlert(row) : null;
}

export async function createHouseholdInviteAlert(userId: string, householdId: string, invitedByUserId: string): Promise<void> {
  await pool.query(
    `
      INSERT INTO alerts (user_id, kind, household_id, invited_by_user_id, status)
      VALUES ($1, 'household_invite', $2, $3, 'pending')
    `,
    [userId, householdId, invitedByUserId],
  );
}

export async function getUserAlerts(userId: string): Promise<Alert[]> {
  const query = `
    SELECT
      a.id,
      a.user_id,
      a.kind,
      a.household_id,
      h.name AS household_name,
      a.invited_by_user_id,
      inviter.name AS invited_by_name,
      a.status,
      a.created_at,
      a.responded_at
    FROM alerts a
    LEFT JOIN households h ON h.id = a.household_id
    LEFT JOIN users inviter ON inviter.id = a.invited_by_user_id
    WHERE a.user_id = $1
    ORDER BY a.created_at DESC
    LIMIT 50
  `;

  const result = await pool.query<AlertRow>(query, [userId]);
  return result.rows.map(toAlert);
}

export async function respondToHouseholdInviteAlert(userId: string, alertId: string, decision: AlertDecision): Promise<Alert> {
  const client = await pool.connect();
  let hasCommitted = false;

  try {
    await client.query("BEGIN");

    const lockResult = await client.query<AlertLockRow>(
      `
        SELECT id, user_id, kind, household_id, invited_by_user_id, status
        FROM alerts
        WHERE id = $1
        FOR UPDATE
      `,
      [alertId],
    );

    const alert = lockResult.rows[0];

    if (!alert) {
      throw new Error("ALERT_NOT_FOUND");
    }

    if (alert.user_id !== userId) {
      throw new Error("ALERT_FORBIDDEN");
    }

    if (alert.kind !== "household_invite") {
      throw new Error("UNSUPPORTED_ALERT_KIND");
    }

    if (alert.status !== "pending") {
      throw new Error("ALERT_ALREADY_RESPONDED");
    }

    if (decision === "decline") {
      await client.query(
        `
          UPDATE alerts
          SET status = 'declined', responded_at = now()
          WHERE id = $1
        `,
        [alertId],
      );

      await client.query("COMMIT");
      hasCommitted = true;
      const declinedAlert = await getAlertByIdForUser(alertId, userId);

      if (!declinedAlert) {
        throw new Error("ALERT_NOT_FOUND");
      }

      return declinedAlert;
    }

    if (!alert.household_id) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    const existingMembership = await client.query<{ household_id: string }>(
      "SELECT household_id FROM household_members WHERE user_id = $1 LIMIT 1",
      [userId],
    );

    if (existingMembership.rows[0]) {
      throw new Error("USER_ALREADY_IN_HOUSEHOLD");
    }

    const householdExists = await client.query<{ id: string }>("SELECT id FROM households WHERE id = $1 LIMIT 1", [alert.household_id]);

    if (!householdExists.rows[0]) {
      throw new Error("HOUSEHOLD_NOT_FOUND");
    }

    await client.query(
      `
        INSERT INTO household_members (household_id, user_id, invited_by_user_id)
        VALUES ($1, $2, $3)
      `,
      [alert.household_id, userId, alert.invited_by_user_id],
    );

    await client.query(
      `
        UPDATE alerts
        SET status = 'accepted', responded_at = now()
        WHERE id = $1
      `,
      [alertId],
    );

    await client.query(
      `
        UPDATE alerts
        SET status = 'declined', responded_at = now()
        WHERE user_id = $1 AND kind = 'household_invite' AND id <> $2 AND status = 'pending'
      `,
      [userId, alertId],
    );

    await client.query("COMMIT");
    hasCommitted = true;

    const acceptedAlert = await getAlertByIdForUser(alertId, userId);

    if (!acceptedAlert) {
      throw new Error("ALERT_NOT_FOUND");
    }

    return acceptedAlert;
  } catch (error) {
    if (!hasCommitted) {
      await client.query("ROLLBACK");
    }

    throw error;
  } finally {
    client.release();
  }
}
