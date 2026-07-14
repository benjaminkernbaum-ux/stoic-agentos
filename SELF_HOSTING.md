# Self-Hosting Stoic AgentOS

Run the API and dashboard on your own infrastructure. You host the two
application services; **Supabase is the system of record** (Postgres +
Auth + row-level security + Vault for encrypted keys), and the platform
talks to it over the Supabase client.

> **Honest scope.** Today self-hosting means *"our services against your
> own Supabase project"* — the free tier is enough. A fully bundled,
> zero-dependency Supabase stack (so there's no external account at all)
> is on the roadmap, not shipped. We'd rather say that plainly than ship a
> compose file that looks self-contained but silently runs in demo mode.

## Prerequisites

- Docker + Docker Compose v2
- A [Supabase](https://supabase.com) project (free tier is fine)

## 1. Configure

```bash
cp .env.selfhost.example .env
```

Fill in the three required values from your Supabase project
(**Settings → API**):

| Variable | What it is |
|----------|------------|
| `SUPABASE_URL` | Your project URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Service-role key — server-side only, never in the browser |
| `SUPABASE_ANON_KEY` | Anon/public key — embedded in the dashboard build (public by design) |

Everything else is optional: `ANTHROPIC_API_KEY` (AI features — per-org BYOK
also works), `STRIPE_*` (billing; empty = everyone on the free plan),
`UPSTASH_REDIS_REST_*` (distributed rate limiting; without it, rate limiting
is in-memory and fine for a single instance).

## 2. Apply the database schema

Migrations are **not** run automatically. In the Supabase **SQL editor**,
run every file in `api/migrations/` in the order given by
[`api/migrations/APPLY_ORDER`](api/migrations/APPLY_ORDER). Features degrade
gracefully if a migration is missing, so a partial apply won't crash the
API — those surfaces just stay dormant until their migration lands.

## 3. Launch

```bash
docker compose up -d
```

- **Dashboard:** http://localhost:3000
- **API:** http://localhost:4444 (health check at `/health`)

Override ports or the dashboard's API URL with `API_PORT`, `DASHBOARD_PORT`,
and `VITE_API_URL` in `.env`. `VITE_API_URL` must be reachable from the
**browser**, not just from inside the Docker network.

## 4. Verify

```bash
curl http://localhost:4444/health          # → { "status": "ok", ... }
docker compose ps                           # both services healthy
```

## Notes

- `SUPABASE_SERVICE_KEY` grants full database access — keep `.env` out of
  version control (it's gitignored) and off the client.
- The dashboard is a static build; changing `VITE_*` values requires a
  rebuild: `docker compose up -d --build dashboard`.
- Upgrades: `git pull && docker compose up -d --build`.

## Roadmap

- **Bundled Supabase stack** — a single compose with Postgres/Auth/PostgREST
  included, so self-hosting needs no external account.
- **On-path enforcement proxy** — so Shield policies are enforced at the
  gateway rather than advisory at the SDK layer.
