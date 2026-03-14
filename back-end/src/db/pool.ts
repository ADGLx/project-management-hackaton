import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  host: env.postgres.host,
  port: env.postgres.port,
  user: env.postgres.user,
  password: env.postgres.password,
  database: env.postgres.database,
});
