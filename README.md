# Planora

Planora is a private, adaptive life-planning app for tasks, routines, calendar events, wellbeing, and practical AI guidance. It learns from the records a user chooses to keep while preserving past days and treating each local day as a fresh planning cycle.

## Apps

- `apps/web`: responsive Next.js web app with light and dark themes.
- `apps/mobile`: native Expo/React Native app with local device notifications.
- `apps/api`: Express API with Prisma, revocable sessions, rate limits, Redis, and optional Ollama inference.
- `packages/shared`: shared Zod schemas, enums, and input types.
- PostgreSQL stores user data; Redis supports health and future background workloads.

## Demo Account

The development seed creates:

- Email: `demo@planora.local`
- Password: `Planora123!`

Do not seed this account in production.

## Quick Start

```powershell
npm.cmd install
docker compose up -d
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000). The API health endpoint is [http://localhost:4000/api/health](http://localhost:4000/api/health).

For the optional local AI model:

```powershell
apps/api/scripts/setup-ollama.ps1
```

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd --workspace @planora/mobile run doctor
```

Deployment, API, mobile, AI, database, and testing details are in `docs/`.
