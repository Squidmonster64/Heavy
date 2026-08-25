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
# set DATABASE_URL and INTERVALS_ATHLETE_ID
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Timezone: `Australia/Perth`. `INTERVALS_API_KEY` is optional until Intervals sync is enabled.

## Railway (new service only)

Create a **new** Railway project/service, not the Lift Log service.

This folder is self-contained for Nixpacks (`railway.json`, `nixpacks.toml`, lockfile). Do not add Railway/Nixpacks config at the repository root — that would change Lift Log.

| Setting | Value |
|---|---|
| Project | Adaptive Fitness Training Hub |
| Service | `training-hub` |
| Branch | `feature/training-hub-v1` |
| Root directory | `training-hub` |
| Build command | `npm run build` |
| Start command | `npx prisma migrate deploy && npm run start` |
| Healthcheck | `GET /api/health` |
| Healthcheck timeout | 300 seconds |

Root directory is required. Without it Railway uses the Lift Log `package.json` at the repo root.

Use a **new** PostgreSQL database. Do not reuse the Lift Log database.

Required env:

```
DATABASE_URL=
INTERVALS_ATHLETE_ID=i568864
TZ=Australia/Perth
```

Optional for now:

```
INTERVALS_API_KEY=
```

`railway.json` already sets build, start, healthcheck path, and the 300s timeout. Do **not** run `prisma migrate deploy` during build. Railway private Postgres is often unreachable from the build machine.

After the first successful deploy only:

```
npx prisma db seed
```

Do not point this service at `main`, merge PR #4, or change the existing Lift Log Railway service.

## Branch

`feature/training-hub-v1` is incubation. After v1 proves useful, either merge into a deliberate monorepo layout or split this directory into its own repository. Do not keep an indefinitely divergent product branch.
