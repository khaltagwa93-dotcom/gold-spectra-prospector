# GOLD SPECTRA PROSPECTOR

AI-Powered Satellite & Geological Gold Exploration Targeting Platform.

> **Scientific disclaimer** (shown in the app itself):
> This system identifies areas with geological, structural and spectral
> characteristics that may be favorable for mineral exploration. It does
> not directly detect, confirm, or prove the presence of gold underground.
> All targets require independent geological and field verification.

---

## What this is

A real Next.js 14 + PostgreSQL/PostGIS full-stack application.
Implements **Phases 1–4**:

| Phase | Scope | Status |
|---|---|---|
| 1 | Architecture + project setup | ✅ Done |
| 2 | Database + authentication | ✅ Done |
| 3 | Google Maps URL parser + AOI engine | ✅ Done |
| 4 | Map UI + drawing tools | ✅ Done |
| 5–15 | Satellite / spectral / geology / prospectivity | ⏳ Not built |
| 16 | Projects + history | ✅ Partially done |

A user today can: sign in, paste a Google Maps link, resolve coordinates,
pick a preset area (1/5/10/25/50 km²) or draw a circle/rectangle/polygon,
and save that AOI to a project.

---

## Setup

```bash
git clone https://github.com/khaltagwa93-dotcom/gold-spectra-prospector.git
cd gold-spectra-prospector
npm install
cp .env.example .env
# fill DATABASE_URL and NEXTAUTH_SECRET at minimum

# One-time, before first migration:
psql "$DATABASE_URL" -f prisma/manual-sql/001_enable_postgis.sql
npx prisma migrate dev --name init
psql "$DATABASE_URL" -f prisma/manual-sql/002_spatial_indexes.sql
npm run db:seed
npm run dev
```

Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`
(defaults in `.env.example` — **change the password after first login**).

```bash
npm test
```

---

## Deploying on Vercel

1. Import this repository in Vercel.
2. Add environment variables (at least `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
3. Use a PostgreSQL host that supports PostGIS (Neon or Supabase).
4. Run the PostGIS enable + spatial index SQL scripts against the database once.
5. Run `npm run db:seed` once against the production DB (or a one-off job).

Live preview (landing page): https://gold-spectra-prospector.vercel.app

---

## Architecture notes

See `ARCHITECTURE.md` for why analysis jobs must not run inside serverless
request handlers, and how PostGIS geometry columns are written via raw SQL.

---

## Security already in place

- Every API route uses `requireUser()` / `requireOwnedProject()`.
- Passwords hashed with bcrypt (cost 12).
- Secrets only in environment variables.
- Prisma `$queryRaw` / `$executeRaw` are parameterized.
