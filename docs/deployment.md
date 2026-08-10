# Deployment

## Production Checklist

1. Provision managed PostgreSQL and authenticated Redis with backups, encryption, and private network access.
2. Set `NODE_ENV=production`, `DATABASE_URL`, `REDIS_URL`, `WEB_ORIGIN`, and a random `JWT_SECRET` of at least 32 bytes.
3. Set `TRUST_PROXY_HOPS` explicitly. Use `0` only when the API is directly exposed; otherwise set the exact number of trusted reverse-proxy hops.
4. Set `NEXT_PUBLIC_API_URL` to the public API URL ending in `/api` before building the web app.
5. Set the documented `MAX_*` account limits or accept the conservative defaults from `.env.example`.
6. If enabled, keep Ollama on a private host and set `OLLAMA_BASE_URL` and `OLLAMA_MODEL`.
7. Run migrations before starting the new API release.
8. Serve API and web only through HTTPS, with request logs, uptime monitoring, and database alerts.
9. Do not run the demo seed in production.

The web session cookie uses `SameSite=Lax` and is scoped to `/api`. Deploy web and API on the same site, such as `app.example.com` and `api.example.com`, or revise and test the cookie/CSRF design before using unrelated domains.

## API

```powershell
npm.cmd --workspace @planora/api run prisma:generate
npm.cmd --workspace @planora/api run prisma:deploy
npm.cmd --workspace @planora/api run build
npm.cmd --workspace @planora/api start
```

The API fails fast in production if authentication configuration is unsafe. `/api/health` reports database and configured Redis readiness.

## Web

```powershell
npm.cmd --workspace @planora/web run build
npm.cmd --workspace @planora/web start
```

Keep `WEB_ORIGIN` limited to exact trusted web origins. Mobile bearer requests do not rely on browser CORS as an authorization boundary.

## Mobile

Set an HTTPS `EXPO_PUBLIC_API_URL` in the EAS production environment, configure EAS/App Store/Play Store credentials, and build with the production profile in `apps/mobile/eas.json`. Production builds reject non-HTTPS API URLs. Review privacy disclosures for tasks, wellbeing, journal, AI personalization, exports, and notifications before store submission.

## Operations

- Test restore procedures, not just backups.
- Rotate leaked credentials and revoke affected sessions.
- Add transactional email before enabling password reset.
- Set data-retention and account-deletion support policies.
- Run typecheck, tests, lint, build, `npm audit`, and Expo Doctor in CI. The current Expo SDK 57 dependency tree reports moderate build-time advisories through `xcode/uuid`; npm's proposed fix is an incompatible Expo downgrade. Keep Expo current and apply the upstream compatible fix when released.
- The root package intentionally overrides Next's optional `sharp` dependency to patched `0.35.3`. Keep the override until a stable Next release declares the 0.35 line, and retain the production build plus live smoke checks when updating either package.
