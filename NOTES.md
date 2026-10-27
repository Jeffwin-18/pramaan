# Notes: mocked, real, and production gaps

## Mocked
- **APAAR checksum.** The real APAAR checksum specification is not public. A Verhoeff checksum stands in. The UI
  always reads "Checksum (mock)" with a `MOCK` badge. The 12-digit and first-digit-1-to-9 format rule is as
  specified in the problem statement.
- **ABC / DigiLocker.** `lib/abc.ts` exports one async function, `verifyWithAbc()`, returning a deterministic mock
  with `source: 'MOCK'`. No endpoint is invented and no live call is made. A real client replaces the function body.
- **Data.** All institutions, students and AICTE IDs are fictional and synthetic. Demo email domains use `.example`.
- **Demo login.** One-click demo accounts (`DEMO_LOGIN=true`) bypass the password. Disable for any real deployment.

## Real (implemented and working)
- **Fingerprint.** `SHA256(salt + normalizedName + dob + normalizedGuardian + gender)`. Only the hash is stored.
  The guardian name is used at ingest and discarded. Aadhaar is never accepted or stored.
- **Rule engine.** Ten named pure rules in `lib/rules/`, plus institution-level rules. Seeded flags are produced by
  running the engine over the data in commit order, not written by hand. Fuzzy matching (token and sorted-string
  Levenshtein, exact DOB) routes to human review and never auto-rejects.
- **Risk score.** Five weighted factors (fill ratio 30, flagged records 25, repeated 100% intake 20, enrolment z-score
  15, invalid APAAR 10), each exposed as data, recomputed after commits and flag actions. Years under 50% reported
  are treated as partial and excluded. With five institutions, peer groups fall back to all institutions.
- **RBAC.** Role checks run server-side in every route (`requireApi`, `requirePage`). Institution admins are scoped
  to their own institution on every query. Escalated flags lock to AICTE. Auditor is read only.
- **Audit.** Every mutation, login, failed login, export, verification attempt, certificate download and public QR
  view writes an AuditLog row. The UI has no edit or delete path for audit entries.
- **Consent-based verification.** APAAR format and checksum gate, explicit consent and purpose, Consent row, audit
  row, 20 per hour limit per verifier, no browsing, no PII export. Exports mask APAAR IDs and omit names.
- **QR and PDF.** QR encodes a public certificate-check URL that shows masked details only. Certificates and the
  summary report are generated as PDF.
- **Versioning.** Each record has numbered versions with field-level diffs and the changing user.

## Policy choices made in the prototype
- Upload commit rejects only unreadable rows. Everything else is stored, with flagged rows set to FLAGGED for review.
- A resolved flag moves its record to VERIFIED only when no open Blocker or Warning remains and the mock ABC check passes.
- Seed data includes a third NRI/OCI/FN inconsistency (the brief lists two) so every rule fires at least three times.
- Seeded version history rows have no individual audit row. The live app writes both together.

## Needed for production
- Real ABC / DigiLocker integration with agreements, consent artefacts and the real APAAR checksum spec.
- PostgreSQL, migrations, backups, and read replicas for reporting. Server-side pagination and DB-side sorting
  (the flag queue currently sorts up to 1000 rows in memory).
- Identity: government SSO or institutional IdP with MFA, session store, CSRF protection, rate limiting, account
  lifecycle. Remove demo login and demo secrets. Rotate `FINGERPRINT_SALT` into a secrets manager (changing it
  invalidates existing fingerprints, so plan re-hashing).
- Append-only, tamper-evident audit storage (hash chaining or WORM storage) and log shipping to a SIEM.
- Background validation for large batches, virus scanning for uploads, size limits, idempotent re-upload.
- Legal review: DPDP Act obligations, consent text, retention and erasure, purpose limitation for verifiers.
- Calibrate rule thresholds and the risk weights with AICTE data. The score is advisory and should be validated
  for bias before any enforcement use.
- Accessibility audit, load testing, penetration test, monitoring and alerting.
