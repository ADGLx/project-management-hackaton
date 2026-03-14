import { pool } from "./pool.js";

interface TransactionTypeRow {
  id: string;
  name: string;
}

export interface UserTransactionType {
  id: string;
  name: string;
}

function mapTransactionTypeRow(row: TransactionTypeRow): UserTransactionType {
  return {
    id: row.id,
    name: row.name,
  };
}

export async function getUserTransactionTypes(userId: string): Promise<UserTransactionType[]> {
  const query = `
    SELECT id, name
    FROM user_transaction_types
    WHERE user_id = $1
    ORDER BY lower(name) ASC
  `;

  const result = await pool.query<TransactionTypeRow>(query, [userId]);
  return result.rows.map(mapTransactionTypeRow);
}

export async function createUserTransactionType(userId: string, name: string): Promise<UserTransactionType> {
  const query = `
    INSERT INTO user_transaction_types (user_id, name)
    VALUES ($1, $2)
    RETURNING id, name
  `;

  const result = await pool.query<TransactionTypeRow>(query, [userId, name]);
  return mapTransactionTypeRow(result.rows[0]);
}

export async function deleteUserTransactionType(userId: string, transactionTypeId: string): Promise<boolean> {
  const query = `
    DELETE FROM user_transaction_types
    WHERE user_id = $1
      AND id = $2
  `;

  const result = await pool.query(query, [userId, transactionTypeId]);
  return (result.rowCount ?? 0) > 0;
}
