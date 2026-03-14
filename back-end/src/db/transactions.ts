import { pool } from "./pool.js";

interface TransactionRow {
  id: string;
  amount_cad: number;
  type: string;
  description: string;
  transaction_date: string;
}

interface MonthlySpendingRow {
  month_start: string;
  spending_amount_cad: number;
}

export interface UserTransaction {
  id: string;
  amountCad: number;
  type: string;
  description: string;
  transactionDate: string;
}

export interface MonthlySpendingPoint {
  monthStart: string;
  spendingAmountCad: number;
}

function mapTransactionRow(row: TransactionRow): UserTransaction {
  return {
    id: row.id,
    amountCad: row.amount_cad,
    type: row.type,
    description: row.description,
    transactionDate: row.transaction_date,
  };
}

export async function createUserTransaction(
  userId: string,
  amountCad: number,
  type: string,
  description: string,
  transactionDate: string,
): Promise<UserTransaction> {
  const query = `
    INSERT INTO transactions (user_id, amount_cad, type, description, transaction_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, amount_cad, type, description, transaction_date::text
  `;

  const result = await pool.query<TransactionRow>(query, [userId, amountCad, type, description, transactionDate]);
  return mapTransactionRow(result.rows[0]);
}

export async function getUserTransactions(userId: string, limit = 100): Promise<UserTransaction[]> {
  const query = `
    SELECT id, amount_cad, type, description, transaction_date::text
    FROM transactions
    WHERE user_id = $1
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT $2
  `;

  const result = await pool.query<TransactionRow>(query, [userId, limit]);

  return result.rows.map(mapTransactionRow);
}

export async function updateUserTransaction(
  userId: string,
  transactionId: string,
  amountCad: number,
  type: string,
  description: string,
  transactionDate: string,
): Promise<UserTransaction | null> {
  const query = `
    UPDATE transactions
    SET amount_cad = $3,
        type = $4,
        description = $5,
        transaction_date = $6
    WHERE user_id = $1
      AND id = $2
    RETURNING id, amount_cad, type, description, transaction_date::text
  `;

  const result = await pool.query<TransactionRow>(query, [userId, transactionId, amountCad, type, description, transactionDate]);
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapTransactionRow(row);
}

export async function deleteUserTransaction(userId: string, transactionId: string): Promise<boolean> {
  const query = `
    DELETE FROM transactions
    WHERE user_id = $1
      AND id = $2
  `;

  const result = await pool.query(query, [userId, transactionId]);
  return (result.rowCount ?? 0) > 0;
}

export async function getUserMonthlySpendingHistory(userId: string, limit = 12): Promise<MonthlySpendingPoint[]> {
  const query = `
    WITH monthly_spending AS (
      SELECT
        date_trunc('month', transaction_date)::date AS month_start,
        SUM(amount_cad)::double precision AS spending_amount_cad
      FROM transactions
      WHERE user_id = $1
      GROUP BY date_trunc('month', transaction_date)::date
      ORDER BY month_start DESC
      LIMIT $2
    )
    SELECT month_start::text, spending_amount_cad
    FROM monthly_spending
    ORDER BY month_start ASC
  `;

  const result = await pool.query<MonthlySpendingRow>(query, [userId, limit]);

  return result.rows.map((row) => ({
    monthStart: row.month_start,
    spendingAmountCad: row.spending_amount_cad,
  }));
}
