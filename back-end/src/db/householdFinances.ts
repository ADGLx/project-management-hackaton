import { pool } from "./pool.js";

interface HouseholdMembershipRow {
  household_id: string;
  created_by_user_id: string;
}

interface HouseholdBudgetRow {
  budget_amount_cad: number;
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

export interface HouseholdTransaction {
  id: string;
  amountCad: number;
  type: string;
  description: string;
  transactionDate: string;
  createdByUserId: string;
  createdByName: string;
}

interface EnsureMembershipResult {
  householdId: string;
  isCreator: boolean;
}

function mapHouseholdTransactionRow(row: HouseholdTransactionRow): HouseholdTransaction {
  return {
    id: row.id,
    amountCad: row.amount_cad,
    type: row.type,
    description: row.description,
    transactionDate: row.transaction_date,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
  };
}

async function ensureHouseholdMembership(userId: string): Promise<EnsureMembershipResult> {
  const result = await pool.query<HouseholdMembershipRow>(
    `
      SELECT hm.household_id, h.created_by_user_id
      FROM household_members hm
      INNER JOIN households h ON h.id = hm.household_id
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
    isCreator: membership.created_by_user_id === userId,
  };
}

export async function getMyHouseholdMonthlyBudget(userId: string): Promise<number | null> {
  const membership = await ensureHouseholdMembership(userId);

  const query = `
    SELECT budget_amount_cad
    FROM household_monthly_budgets
    WHERE household_id = $1
      AND month_start = date_trunc('month', now())::date
    LIMIT 1
  `;

  const result = await pool.query<HouseholdBudgetRow>(query, [membership.householdId]);
  return result.rows[0]?.budget_amount_cad ?? null;
}

export async function upsertMyHouseholdMonthlyBudget(userId: string, budgetAmountCad: number): Promise<number> {
  const membership = await ensureHouseholdMembership(userId);

  if (!membership.isCreator) {
    throw new Error("ONLY_CREATOR_CAN_SET_HOUSEHOLD_BUDGET");
  }

  const query = `
    INSERT INTO household_monthly_budgets (household_id, month_start, budget_amount_cad)
    VALUES ($1, date_trunc('month', now())::date, $2)
    ON CONFLICT (household_id, month_start)
    DO UPDATE SET budget_amount_cad = EXCLUDED.budget_amount_cad
    RETURNING budget_amount_cad
  `;

  const result = await pool.query<HouseholdBudgetRow>(query, [membership.householdId, budgetAmountCad]);
  return result.rows[0].budget_amount_cad;
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
  return result.rows.map(mapHouseholdTransactionRow);
}

export async function createMyHouseholdTransaction(
  userId: string,
  amountCad: number,
  type: string,
  description: string,
  transactionDate: string,
): Promise<HouseholdTransaction> {
  const membership = await ensureHouseholdMembership(userId);

  const query = `
    INSERT INTO household_transactions (household_id, created_by_user_id, amount_cad, type, description, transaction_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, amount_cad, type, description, transaction_date::text, created_by_user_id
  `;

  const created = await pool.query<
    Omit<HouseholdTransactionRow, "created_by_name">
  >(query, [membership.householdId, userId, amountCad, type, description, transactionDate]);

  const row = created.rows[0];

  const nameResult = await pool.query<{ name: string }>("SELECT name FROM users WHERE id = $1 LIMIT 1", [userId]);
  const createdByName = nameResult.rows[0]?.name ?? "Member";

  return {
    id: row.id,
    amountCad: row.amount_cad,
    type: row.type,
    description: row.description,
    transactionDate: row.transaction_date,
    createdByUserId: row.created_by_user_id,
    createdByName,
  };
}

export async function updateMyHouseholdTransaction(
  userId: string,
  transactionId: string,
  amountCad: number,
  type: string,
  description: string,
  transactionDate: string,
): Promise<HouseholdTransaction | null> {
  const membership = await ensureHouseholdMembership(userId);

  const query = `
    UPDATE household_transactions
    SET amount_cad = $3,
        type = $4,
        description = $5,
        transaction_date = $6
    WHERE id = $1
      AND household_id = $2
    RETURNING id, amount_cad, type, description, transaction_date::text, created_by_user_id
  `;

  const result = await pool.query<
    Omit<HouseholdTransactionRow, "created_by_name">
  >(query, [transactionId, membership.householdId, amountCad, type, description, transactionDate]);
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const nameResult = await pool.query<{ name: string }>("SELECT name FROM users WHERE id = $1 LIMIT 1", [row.created_by_user_id]);
  const createdByName = nameResult.rows[0]?.name ?? "Member";

  return {
    id: row.id,
    amountCad: row.amount_cad,
    type: row.type,
    description: row.description,
    transactionDate: row.transaction_date,
    createdByUserId: row.created_by_user_id,
    createdByName,
  };
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
