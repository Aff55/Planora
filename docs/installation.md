# Installation Guide

## Requirements

- Node.js 20 or newer.
- npm 10 or newer. On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`.
- Docker with Compose for PostgreSQL and Redis.

## Environment

Copy `.env.example` to `.env` at the repo root if you want shared values. Also copy:

- `apps/api/.env.example` to `apps/api/.env`
- `apps/web/.env.example` to `apps/web/.env.local`

## Setup

```bash
npm.cmd install
docker compose up -d
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

## Local URLs

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/api/health`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
