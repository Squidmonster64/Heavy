# Adaptive Fitness — Training Hub v1

Incubation app inside the Lift Log (`Heavy`) repository. This directory is a **separate application**.

Lift Log production at the repository root is unchanged. Do not point the existing Lift Log Railway service at this folder. Do not reuse the Lift Log database.

## What this is

Canonical training program, session snapshots, execution-app exports, and Intervals.icu planned/actual sync.

This is not an AI coaching engine.

## Local

```bash
cd training-hub
cp .env.example .env
# set DATABASE_URL, APP_PASSCODE, INTERVALS_API_KEY, INTERVALS_ATHLETE_ID
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Timezone: `Australia/Perth`.

## Railway (new service only)

Create a **new** Railway project/service, not the Lift Log service.

This folder is self-contained for Nixpacks (`railway.json`, `nixpacks.toml`, lockfile). Do not add Railway/Nixpacks config at the repository root — that would change Lift Log.

1. Root directory: `training-hub` (required; otherwise Railway uses the Lift Log `package.json` at the repo root)
2. Watch branch: `feature/training-hub-v1` until this is merged
3. New PostgreSQL plugin / database (do not reuse Lift Log)
4. Environment variables:

```
DATABASE_URL=
APP_PASSCODE=
INTERVALS_API_KEY=
INTERVALS_ATHLETE_ID=i568864
TZ=Australia/Perth
```

`railway.json` already sets:

- Build: `npm run build` (`prisma generate` then `next build`)
- Start: `npx prisma migrate deploy && npm run start`
- Healthcheck: `GET /api/health` (public; does not check the database)

Do **not** run `prisma migrate deploy` during build. Railway private Postgres is often unreachable from the build machine.

Seed once after first successful deploy:

```
npx prisma db seed
```

Replace any previously used Intervals API key before production.

## Branch

`feature/training-hub-v1` is incubation. After v1 proves useful, either merge into a deliberate monorepo layout or split this directory into its own repository. Do not keep an indefinitely divergent product branch.
