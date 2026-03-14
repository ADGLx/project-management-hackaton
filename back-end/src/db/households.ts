import { pool } from "./pool.js";

interface HouseholdRow {
  id: string;
  name: string;
  created_by_user_id: string;
  created_at: string;
}

interface HouseholdMemberRow {
  user_id: string;
  user_name: string;
  user_email: string;
}

export interface HouseholdMember {
  userId: string;
  name: string;
  email: string;
}

export interface Household {
  id: string;
  name: string;
  createdByUserId: string;
  createdAt: string;
  members: HouseholdMember[];
}

export type LeaveHouseholdResult = "LEFT" | "LEFT_AND_DELETED_HOUSEHOLD" | "NOT_IN_HOUSEHOLD" | "CREATOR_WITH_OTHER_MEMBERS";

function toHousehold(row: HouseholdRow, members: HouseholdMember[]): Household {
  return {
    id: row.id,
    name: row.name,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    members,
  };
}

async function getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const query = `
    SELECT hm.user_id, u.name AS user_name, u.email AS user_email
    FROM household_members hm
    INNER JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = $1
    ORDER BY hm.created_at ASC
  `;

  const result = await pool.query<HouseholdMemberRow>(query, [householdId]);
  return result.rows.map((row) => ({
    userId: row.user_id,
    name: row.user_name,
    email: row.user_email,
  }));
}

export async function getUserHousehold(userId: string): Promise<Household | null> {
  const query = `
    SELECT h.id, h.name, h.created_by_user_id, h.created_at
    FROM households h
    INNER JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = $1
    LIMIT 1
  `;

  const result = await pool.query<HouseholdRow>(query, [userId]);
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const members = await getHouseholdMembers(row.id);
  return toHousehold(row, members);
}

export async function createHouseholdWithOwner(userId: string, name: string): Promise<Household> {
  const trimmedName = String(name).trim();

  const existingMembership = await pool.query<{ household_id: string }>(
    "SELECT household_id FROM household_members WHERE user_id = $1 LIMIT 1",
    [userId],
  );

  if (existingMembership.rows[0]) {
    throw new Error("USER_ALREADY_IN_HOUSEHOLD");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const householdResult = await client.query<HouseholdRow>(
      `
        INSERT INTO households (name, created_by_user_id)
        VALUES ($1, $2)
        RETURNING id, name, created_by_user_id, created_at
      `,
      [trimmedName, userId],
    );

    const household = householdResult.rows[0];

    await client.query(
      `
        INSERT INTO household_members (household_id, user_id, invited_by_user_id)
        VALUES ($1, $2, NULL)
      `,
      [household.id, userId],
    );

    await client.query("COMMIT");

    const members = await getHouseholdMembers(household.id);
    return toHousehold(household, members);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function inviteUserToHouseholdByEmail(
  requesterUserId: string,
  householdId: string,
  inviteeEmail: string,
): Promise<Household> {
  const normalizedEmail = String(inviteeEmail).trim().toLowerCase();

  const householdResult = await pool.query<HouseholdRow>(
    `
      SELECT id, name, created_by_user_id, created_at
      FROM households
      WHERE id = $1
      LIMIT 1
    `,
    [householdId],
  );

  const household = householdResult.rows[0];

  if (!household) {
    throw new Error("HOUSEHOLD_NOT_FOUND");
  }

  if (household.created_by_user_id !== requesterUserId) {
    throw new Error("REQUESTER_NOT_CREATOR");
  }

  const requesterMembership = await pool.query<{ household_id: string }>(
    "SELECT household_id FROM household_members WHERE user_id = $1 AND household_id = $2 LIMIT 1",
    [requesterUserId, householdId],
  );

  if (!requesterMembership.rows[0]) {
    throw new Error("REQUESTER_NOT_IN_HOUSEHOLD");
  }

  const inviteeResult = await pool.query<{ id: string }>("SELECT id FROM users WHERE lower(email) = $1 LIMIT 1", [normalizedEmail]);
  const invitee = inviteeResult.rows[0];

  if (!invitee) {
    throw new Error("INVITEE_NOT_FOUND");
  }

  const existingInviteeMembership = await pool.query<{ household_id: string }>(
    "SELECT household_id FROM household_members WHERE user_id = $1 LIMIT 1",
    [invitee.id],
  );

  if (existingInviteeMembership.rows[0]) {
    throw new Error("INVITEE_ALREADY_IN_HOUSEHOLD");
  }

  await pool.query(
    `
      INSERT INTO household_members (household_id, user_id, invited_by_user_id)
      VALUES ($1, $2, $3)
    `,
    [householdId, invitee.id, requesterUserId],
  );

  const members = await getHouseholdMembers(household.id);
  return toHousehold(household, members);
}

export async function leaveUserHousehold(userId: string): Promise<LeaveHouseholdResult> {
  const membershipResult = await pool.query<{ id: string; created_by_user_id: string }>(
    `
      SELECT h.id, h.created_by_user_id
      FROM households h
      INNER JOIN household_members hm ON hm.household_id = h.id
      WHERE hm.user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  const membership = membershipResult.rows[0];

  if (!membership) {
    return "NOT_IN_HOUSEHOLD";
  }

  const memberCountResult = await pool.query<{ member_count: string }>(
    "SELECT COUNT(*)::text AS member_count FROM household_members WHERE household_id = $1",
    [membership.id],
  );

  const memberCount = Number(memberCountResult.rows[0]?.member_count ?? "0");
  const isCreator = membership.created_by_user_id === userId;

  if (isCreator && memberCount > 1) {
    return "CREATOR_WITH_OTHER_MEMBERS";
  }

  if (isCreator) {
    await pool.query("DELETE FROM households WHERE id = $1", [membership.id]);
    return "LEFT_AND_DELETED_HOUSEHOLD";
  }

  await pool.query("DELETE FROM household_members WHERE household_id = $1 AND user_id = $2", [membership.id, userId]);
  return "LEFT";
}
