import { pool } from "./pool.js";

interface HouseholdMembershipRow {
  household_id: string;
}

interface HouseholdMemberRow {
  user_id: string;
  user_name: string;
}

interface HouseholdTransactionRow {
  id: string;
  amount_cad: number;
  type: string;
  description: string;
  transaction_date: string;
  created_by_user_id: string;
  created_by_name: string;
}

interface TransactionParticipantRow {
  transaction_id: string;
  user_id: string;
  user_name: string;
}

interface EnsureMembershipResult {
  householdId: string;
}

interface MemberInfo {
  userId: string;
  name: string;
}

export interface HouseholdTransactionParticipant {
  userId: string;
  name: string;
}

export interface HouseholdTransaction {
  id: string;
  amountCad: number;
  type: string;
  description: string;
  transactionDate: string;
  createdByUserId: string;
  createdByName: string;
  participants: HouseholdTransactionParticipant[];
}

export interface SettlementLine {
  toUserId: string;
  toName: string;
  amountCad: number;
}

export interface HouseholdSettlementSummary {
  month: string;
  totalPaidByCurrentUserCad: number;
  youOwe: SettlementLine[];
}

function centsToCad(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function cadToCents(amountCad: number): number {
  return Math.round(amountCad * 100);
}

function mapTransactionRow(
  row: HouseholdTransactionRow,
  participantsByTransactionId: Map<string, HouseholdTransactionParticipant[]>,
): HouseholdTransaction {
  return {
    id: row.id,
    amountCad: row.amount_cad,
    type: row.type,
    description: row.description,
    transactionDate: row.transaction_date,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    participants: participantsByTransactionId.get(row.id) ?? [],
  };
}

async function ensureHouseholdMembership(userId: string): Promise<EnsureMembershipResult> {
  const result = await pool.query<HouseholdMembershipRow>(
    `
      SELECT hm.household_id
      FROM household_members hm
      WHERE hm.user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  const membership = result.rows[0];

  if (!membership) {
    throw new Error("USER_NOT_IN_HOUSEHOLD");
  }

  return {
    householdId: membership.household_id,
  };
}

async function getHouseholdMembers(householdId: string): Promise<MemberInfo[]> {
  const result = await pool.query<HouseholdMemberRow>(
    `
      SELECT hm.user_id, u.name AS user_name
      FROM household_members hm
      INNER JOIN users u ON u.id = hm.user_id
      WHERE hm.household_id = $1
    `,
    [householdId],
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    name: row.user_name,
  }));
}

function normalizeParticipantUserIds(participantUserIds: string[]): string[] {
  return Array.from(new Set(participantUserIds.map((id) => String(id).trim()).filter(Boolean)));
}

async function assertParticipantsBelongToHousehold(householdId: string, participantUserIds: string[]): Promise<void> {
  if (participantUserIds.length === 0) {
    throw new Error("PARTICIPANTS_REQUIRED");
  }

  const members = await getHouseholdMembers(householdId);
  const memberIds = new Set(members.map((member) => member.userId));

  const hasInvalidParticipant = participantUserIds.some((participantUserId) => !memberIds.has(participantUserId));

  if (hasInvalidParticipant) {
    throw new Error("PARTICIPANTS_MUST_BE_HOUSEHOLD_MEMBERS");
  }
}

async function getTransactionParticipants(transactionIds: string[]): Promise<Map<string, HouseholdTransactionParticipant[]>> {
  const byTransactionId = new Map<string, HouseholdTransactionParticipant[]>();

  if (transactionIds.length === 0) {
    return byTransactionId;
  }

  const result = await pool.query<TransactionParticipantRow>(
    `
      SELECT htp.transaction_id, htp.user_id, u.name AS user_name
      FROM household_transaction_participants htp
      INNER JOIN users u ON u.id = htp.user_id
      WHERE htp.transaction_id = ANY($1::uuid[])
      ORDER BY u.name ASC
    `,
    [transactionIds],
  );

  for (const row of result.rows) {
    const list = byTransactionId.get(row.transaction_id) ?? [];
    list.push({
      userId: row.user_id,
      name: row.user_name,
    });
    byTransactionId.set(row.transaction_id, list);
  }

  return byTransactionId;
}

async function replaceTransactionParticipants(
  transactionId: string,
  participantUserIds: string[],
  client: { query: typeof pool.query },
): Promise<void> {
  await client.query("DELETE FROM household_transaction_participants WHERE transaction_id = $1", [transactionId]);

  for (const participantUserId of participantUserIds) {
    await client.query(
      `
        INSERT INTO household_transaction_participants (transaction_id, user_id)
        VALUES ($1, $2)
      `,
      [transactionId, participantUserId],
    );
  }
}

export async function getMyHouseholdTransactions(userId: string, limit = 150): Promise<HouseholdTransaction[]> {
  const membership = await ensureHouseholdMembership(userId);

  const query = `
    SELECT
      ht.id,
      ht.amount_cad,
      ht.type,
      ht.description,
      ht.transaction_date::text,
      ht.created_by_user_id,
      u.name AS created_by_name
    FROM household_transactions ht
    INNER JOIN users u ON u.id = ht.created_by_user_id
    WHERE ht.household_id = $1
    ORDER BY ht.transaction_date DESC, ht.created_at DESC
    LIMIT $2
  `;

  const result = await pool.query<HouseholdTransactionRow>(query, [membership.householdId, limit]);
  const transactionIds = result.rows.map((row) => row.id);
  const participantsByTransactionId = await getTransactionParticipants(transactionIds);

  return result.rows.map((row) => mapTransactionRow(row, participantsByTransactionId));
}

export async function createMyHouseholdTransaction(
  userId: string,
  amountCad: number,
  type: string,
  description: string,
  transactionDate: string,
  participantUserIds: string[],
  mirrorToPersonal = false,
): Promise<HouseholdTransaction> {
  const membership = await ensureHouseholdMembership(userId);
  const normalizedParticipants = normalizeParticipantUserIds(participantUserIds);
  await assertParticipantsBelongToHousehold(membership.householdId, normalizedParticipants);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const created = await client.query<HouseholdTransactionRow>(
      `
        INSERT INTO household_transactions (household_id, created_by_user_id, amount_cad, type, description, transaction_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, amount_cad, type, description, transaction_date::text, created_by_user_id,
          (SELECT name FROM users WHERE id = created_by_user_id) AS created_by_name
      `,
      [membership.householdId, userId, amountCad, type, description, transactionDate],
    );

    const transaction = created.rows[0];

    await replaceTransactionParticipants(transaction.id, normalizedParticipants, client);

    if (mirrorToPersonal) {
      await client.query(
        `
          INSERT INTO transactions (user_id, amount_cad, type, description, transaction_date)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [userId, amountCad, type, description, transactionDate],
      );
    }

    await client.query("COMMIT");

    const participantsByTransactionId = await getTransactionParticipants([transaction.id]);
    return mapTransactionRow(transaction, participantsByTransactionId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateMyHouseholdTransaction(
  userId: string,
  transactionId: string,
  amountCad: number,
  type: string,
  description: string,
  transactionDate: string,
  participantUserIds: string[],
): Promise<HouseholdTransaction | null> {
  const membership = await ensureHouseholdMembership(userId);
  const normalizedParticipants = normalizeParticipantUserIds(participantUserIds);
  await assertParticipantsBelongToHousehold(membership.householdId, normalizedParticipants);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<HouseholdTransactionRow>(
      `
        UPDATE household_transactions
        SET amount_cad = $3,
            type = $4,
            description = $5,
            transaction_date = $6
        WHERE id = $1
          AND household_id = $2
        RETURNING id, amount_cad, type, description, transaction_date::text, created_by_user_id,
          (SELECT name FROM users WHERE id = created_by_user_id) AS created_by_name
      `,
      [transactionId, membership.householdId, amountCad, type, description, transactionDate],
    );

    const row = result.rows[0];

    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }

    await replaceTransactionParticipants(row.id, normalizedParticipants, client);

    await client.query("COMMIT");

    const participantsByTransactionId = await getTransactionParticipants([row.id]);
    return mapTransactionRow(row, participantsByTransactionId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMyHouseholdTransaction(userId: string, transactionId: string): Promise<boolean> {
  const membership = await ensureHouseholdMembership(userId);

  const query = `
    DELETE FROM household_transactions
    WHERE id = $1
      AND household_id = $2
  `;

  const result = await pool.query(query, [transactionId, membership.householdId]);
  return (result.rowCount ?? 0) > 0;
}

function parseMonthToDateRange(month: string): { startDate: string; endDateExclusive: string } {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("INVALID_MONTH");
  }

  const startDate = `${month}-01`;
  const start = new Date(`${startDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== startDate) {
    throw new Error("INVALID_MONTH");
  }

  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));

  return {
    startDate,
    endDateExclusive: end.toISOString().slice(0, 10),
  };
}

export async function getMyHouseholdSettlementSummary(userId: string, month: string): Promise<HouseholdSettlementSummary> {
  const membership = await ensureHouseholdMembership(userId);
  const { startDate, endDateExclusive } = parseMonthToDateRange(month);

  const members = await getHouseholdMembers(membership.householdId);
  const memberNameById = new Map(members.map((member) => [member.userId, member.name]));

  const transactions = await pool.query<HouseholdTransactionRow>(
    `
      SELECT
        ht.id,
        ht.amount_cad,
        ht.type,
        ht.description,
        ht.transaction_date::text,
        ht.created_by_user_id,
        u.name AS created_by_name
      FROM household_transactions ht
      INNER JOIN users u ON u.id = ht.created_by_user_id
      WHERE ht.household_id = $1
        AND ht.transaction_date >= $2::date
        AND ht.transaction_date < $3::date
    `,
    [membership.householdId, startDate, endDateExclusive],
  );

  const transactionIds = transactions.rows.map((row) => row.id);
  const participantsByTransactionId = await getTransactionParticipants(transactionIds);

  let totalPaidByCurrentUserCents = 0;
  const obligationsByDebtor = new Map<string, Map<string, number>>();

  for (const transaction of transactions.rows) {
    const participants = participantsByTransactionId.get(transaction.id) ?? [];

    if (participants.length === 0) {
      continue;
    }

    const totalCents = cadToCents(transaction.amount_cad);
    const baseShare = Math.floor(totalCents / participants.length);
    const remainder = totalCents % participants.length;
    const sortedParticipants = [...participants].sort((left, right) => left.userId.localeCompare(right.userId));

    if (transaction.created_by_user_id === userId) {
      totalPaidByCurrentUserCents += totalCents;
    }

    for (let index = 0; index < sortedParticipants.length; index += 1) {
      const participant = sortedParticipants[index];
      const shareCents = baseShare + (index < remainder ? 1 : 0);

      if (participant.userId === transaction.created_by_user_id || shareCents <= 0) {
        continue;
      }

      const creditorMap = obligationsByDebtor.get(participant.userId) ?? new Map<string, number>();
      creditorMap.set(
        transaction.created_by_user_id,
        (creditorMap.get(transaction.created_by_user_id) ?? 0) + shareCents,
      );
      obligationsByDebtor.set(participant.userId, creditorMap);
    }
  }

  const sortedMemberIds = Array.from(new Set([...memberNameById.keys(), userId])).sort((left, right) => left.localeCompare(right));
  const youOweLines: SettlementLine[] = [];

  for (let leftIndex = 0; leftIndex < sortedMemberIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sortedMemberIds.length; rightIndex += 1) {
      const left = sortedMemberIds[leftIndex];
      const right = sortedMemberIds[rightIndex];

      const leftToRight = obligationsByDebtor.get(left)?.get(right) ?? 0;
      const rightToLeft = obligationsByDebtor.get(right)?.get(left) ?? 0;
      const net = leftToRight - rightToLeft;

      if (net > 0 && left === userId) {
        youOweLines.push({
          toUserId: right,
          toName: memberNameById.get(right) ?? "Member",
          amountCad: centsToCad(net),
        });
      }

      if (net < 0 && right === userId) {
        youOweLines.push({
          toUserId: left,
          toName: memberNameById.get(left) ?? "Member",
          amountCad: centsToCad(Math.abs(net)),
        });
      }
    }
  }

  youOweLines.sort((left, right) => right.amountCad - left.amountCad);

  return {
    month,
    totalPaidByCurrentUserCad: centsToCad(totalPaidByCurrentUserCents),
    youOwe: youOweLines,
  };
}
