import { pool } from "./pool.js";
import type { User, UserWithPassword } from "../types/auth.js";

export async function createUser(name: string, email: string, passwordHash: string): Promise<User> {
  const normalizedName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();

  const query = `
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, created_at
  `;

  const result = await pool.query<User>(query, [normalizedName, normalizedEmail, passwordHash]);
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const normalizedEmail = String(email).trim().toLowerCase();

  const query = `
    SELECT id, name, email, password_hash, created_at
    FROM users
    WHERE lower(email) = $1
    LIMIT 1
  `;

  const result = await pool.query<UserWithPassword>(query, [normalizedEmail]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const query = `
    SELECT id, name, email, created_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query<User>(query, [id]);
  return result.rows[0] ?? null;
}
