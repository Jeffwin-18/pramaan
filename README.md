# APAAR Verification Platform

Prototype for SIH 2026, problem statement SIH26263: APAAR ID based student data management and
verification platform for AICTE-approved institutions. Team Deep Thinkers.

All institutions and students are fictional. Data is synthetic. The APAAR checksum and the ABC / DigiLocker
adapter are simulated and always marked `MOCK`. See `NOTES.md`.

## Run

Requires Node 18.18 or later and network access to download Prisma engines on first install.

    npm install && npm run db:push && npm run db:seed && npm run dev

Open http://localhost:3000. Database is SQLite at `prisma/dev.db`. `.env` ships with demo secrets.

| Command | Purpose |
|---|---|
| `npm run db:push` | Create the SQLite schema and generate the Prisma client |
| `npm run db:seed` | Clear and reseed the demo data (idempotent) |
| `npm run db:reset` | Force-reset the schema, then reseed |
| `npm run db:preview` | Print seed counts, rule firings and risk scores without touching the database |
| `npm run typecheck` | TypeScript check |

## Demo accounts

Password for all accounts: `Demo@2026`. The login screen also has one-click demo buttons (set `DEMO_LOGIN=false` in `.env` to disable).

| Role | Email | Scope |
|---|---|---|
| AICTE Admin | aicte.admin@demo.aicte.example | National |
| Institution Admin | inst.kaveri@demo.aicte.example | Kaveri only. Others: `inst.sanjeevani`, `inst.sabarmati`, `inst.narmada`, `inst.vaigai` @demo.aicte.example |
| Verifier (employer) | hr.verifier@talentbridge.example | Verify one APAAR ID at a time |
| Verifier (regulator) | regulator@statecouncil.example | Same |
| Auditor | auditor@demo.aicte.example | Read only, all data |

## Judge demo script (about 3 minutes)

1. **National view.** Sign in as AICTE Admin. Overview shows KPIs, state coverage, open flags by rule and the
   risk leaderboard. Sabarmati ranks first (exactly 100% intake in both years). Click Kaveri: its course table
   shows negative gaps in 2025-26, about 9% over approved intake.
2. **Human review queue.** Open Flag queue, filter rule `NAME_NEAR_MATCH_EXISTING`. Expand "Akshhhya Mandar
   Kulkarni" (confidence 0.88): the matched record at another institution is shown beside the explanation.
   Resolve it with a note. The action lands in the audit log.
3. **Upload with live validation.** Sign out, use "Demo as Institution" (Kaveri). Upload data, "Load demo batch",
   Next, Run validation. Expand rows to see rule codes, explanations and "Format ✓ · Checksum (mock)". Commit
   batch, then "View flags from this batch".
4. **Record drawer.** Student records, search `Karthik Gokul`. The drawer shows the fingerprint (hover: one-way
   hash, no Aadhaar), flags, and the version timeline with field-level diffs and who changed what.
5. **Consent-based verification.** Sign in as Verifier. Enter `784201322590`, purpose employment, tick consent,
   Verify. The card shows the Verified seal, a QR code and a certificate PDF. The audit entry appears on the same
   page. Scan the QR or open the link: a public page shows masked details and logs the view. Sign in as AICTE
   Admin, open Audit log, filter action `VERIFY_RECORD`.

Other seeded verifiable IDs: `140231082766`, `553597976778`.

## What is where

    app/(app)/*         Screens: overview, institutions, upload, flags, records, verify, reports, audit
    app/c/[token]       Public certificate check page (QR target, masked)
    app/api/v1/*        REST API. Every route enforces role server-side and writes AuditLog on mutations
    lib/rules/*         The 10 named rules plus institution-level rules. Pure (record, context) => Flag[]
    lib/risk.ts         Institution risk score. lib/risk-db.ts recomputes it after commits and flag actions
    lib/upload/*        CSV mapping, validation (pure), demo batch generator
    lib/abc.ts          ABC / DigiLocker adapter (mock, one function)
    prisma/seed-data.ts Builds the dataset in memory and runs the real rule engine. seed.ts writes it

## API

| Method and path | Roles |
|---|---|
| POST /api/v1/auth/login, /auth/logout | any |
| GET /institutions, /institutions/:id | AICTE, Institution (own), Auditor |
| POST /uploads/validate, /uploads/commit | Institution |
| GET /records, /records/:id, /records/:id/versions | AICTE, Institution (own), Auditor |
| GET /flags, PATCH /flags/:id, POST /flags/bulk | AICTE, Institution (own), Auditor (read only) |
| POST /verify, GET /verify/:token | Verifier, AICTE. The :token GET is public and masked |
| GET /reports/coverage.csv, flags.csv, over-intake.csv, summary.pdf | AICTE, Auditor, Institution (own) |
| GET /audit | AICTE, Auditor |

## Keyboard

`/` focus search, `Esc` close drawer or dialog, `?` shortcut sheet, `g` then `o`, `f`, `r` to jump to Overview, Flags, Records.
