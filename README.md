# Project Management Hackaton - Docker Setup

This project runs with Docker Compose using:

- Node.js backend (Express + TypeScript)
- React + Vite frontend (TypeScript)
- PostgreSQL 17 database

## Quick start

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start all services:

```bash
docker compose up --build
```

3. Run typechecking locally:

```bash
cd front-end && npm install && npm run typecheck
cd ../back-end && npm install && npm run typecheck
```

## Services

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Backend health endpoint: http://localhost:3000/health
- Postgres: localhost:5432

## Authentication endpoints

- `POST /auth/register` with body `{ "name": "Alex Rivera", "email": "user@example.com", "password": "password123" }`
- `POST /auth/login` with body `{ "email": "user@example.com", "password": "password123" }`
- `GET /auth/me` (requires auth cookie)
- `POST /auth/logout`

The backend uses `pg` with parameterized SQL and file-based SQL migrations. On startup it applies migrations from `back-end/src/db/migrations`.

## Environment variables

Set these in `.env`:

- `FRONTEND_ORIGIN` for CORS origin (default `http://localhost:5173`)
- `JWT_SECRET` for signing auth tokens
- `JWT_EXPIRES_IN` for token lifetime (default `1d`)
- `COOKIE_SECURE` set to `true` in production HTTPS environments
- `COOKIE_MAX_AGE_MS` for cookie lifetime in milliseconds (default `86400000`)

## Hot reload and bind mounts

- `./front-end` is mounted into frontend container
- `./back-end` is mounted into backend container
- Frontend runs `vite` in dev mode
- Backend runs `nodemon` in dev mode

Changes on your local files are reflected inside containers.

## Scripts

Frontend (`front-end/package.json`):

- `npm run dev` starts Vite dev server
- `npm run build` builds production assets
- `npm run preview` previews production build
- `npm run typecheck` runs TypeScript type checking

Backend (`back-end/package.json`):

- `npm run dev` starts backend with `tsx watch`
- `npm run start` starts backend with `tsx`
- `npm run typecheck` runs TypeScript type checking
