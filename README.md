# Project Management Hackaton

Full-stack TypeScript app with cookie-based authentication.

- Frontend: React + Vite + React Router (`front-end`)
- Backend: Express + PostgreSQL + JWT in HTTP-only cookie (`back-end`)
- Database: PostgreSQL 17 (Docker service)

## Current features

- Register, login, logout, and session restore (`/auth/me`)
- Protected and public route gates on the frontend
- Automatic SQL migrations on backend startup (`back-end/src/db/migrations`)
- Health endpoint for backend + database connectivity checks (`/health`)

## Quick start (Docker)

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Make sure `FRONTEND_ORIGIN` in `.env` matches your frontend URL (default frontend URL is `http://localhost:5173`).

3. Start all services:

```bash
docker compose up --build
```

## Services

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Backend health endpoint: `http://localhost:3000/health`
- Postgres: runs inside Docker network as `pmh-db:5432`

Note: Postgres host port is currently not exposed in `docker-compose.yml`. If you need direct local access, uncomment the `db.ports` block.

## Auth API

- `POST /auth/register`
  - body: `{ "name": "Alex Rivera", "email": "user@example.com", "password": "password123" }`
  - validations: name required (2-80 chars), valid email, password min 8 chars
  - success: `201` + `{ user }` and auth cookie set
- `POST /auth/login`
  - body: `{ "email": "user@example.com", "password": "password123" }`
  - success: `200` + `{ user }` and auth cookie set
- `GET /auth/me`
  - requires auth cookie
  - success: `200` + `{ user }`
- `POST /auth/logout`
  - clears auth cookie

## Environment variables

Set these in `.env` (see `.env.example`):

- `POSTGRES_HOST` (default `pmh-db` in Docker)
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT` (default `5432`)
- `BACKEND_PORT` (default `3000`)
- `FRONTEND_PORT` (default `5173`)
- `FRONTEND_ORIGIN` (must match the frontend URL used in browser)
- `VITE_API_URL` (frontend API base URL, default `http://localhost:3000`)
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (default `1d`)
- `COOKIE_SECURE` (`true` in production HTTPS)
- `COOKIE_MAX_AGE_MS` (default `86400000`)

## Hot reload and bind mounts

- `./front-end` is mounted into the frontend container
- `./back-end` is mounted into the backend container
- Frontend runs `vite` in dev mode
- Backend runs `tsx watch` in dev mode

Changes on local files are reflected inside containers.

## Scripts

Frontend (`front-end/package.json`):

- `npm run dev` starts Vite dev server
- `npm run build` builds production assets
- `npm run preview` previews production build
- `npm run typecheck` runs TypeScript type checking

Backend (`back-end/package.json`):

- `npm run dev` starts backend with `tsx watch src/index.ts`
- `npm run start` starts backend with `tsx src/index.ts`
- `npm run typecheck` runs TypeScript type checking
