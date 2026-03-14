function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  port: parseNumber(process.env.PORT, 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  cookieMaxAgeMs: parseNumber(process.env.COOKIE_MAX_AGE_MS, 24 * 60 * 60 * 1000),
  postgres: {
    host: process.env.POSTGRES_HOST,
    port: parseNumber(process.env.POSTGRES_PORT, 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },
};
