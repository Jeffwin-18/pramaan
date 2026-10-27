# Pramaan

**APAAR-based Student Record Management and Verification Platform**

Built for **Smart India Hackathon 2026 (SIH26263)** by **Team Deep Thinkers**.

Pramaan is a web application prototype designed to help AICTE-approved institutions manage student records, identify data inconsistencies, and handle verification requests through a structured and auditable workflow.

Instead of treating every mismatch as an error, the platform flags records for review, gives administrators visibility into potential issues, and keeps a history of important changes.

## Features

- **Student Record Management** — View student records, their verification status, and version history.
- **CSV Upload and Validation** — Import institutional records, validate data, review flagged entries, and commit upload batches.
- **Data Quality Checks** — Detect invalid formats, duplicate or potentially matching records, and institutional inconsistencies.
- **Manual Review Workflow** — Route suspicious records for human review rather than automatically rejecting potential matches.
- **Institution Risk Dashboard** — View data-quality indicators and the factors contributing to an institution's prototype risk score.
- **Role-Based Access Control** — Separate permissions for AICTE administrators, institution administrators, verifiers, and auditors.
- **Consent-Based Verification** — Record the purpose and consent for verification requests, with rate limiting and masked results.
- **QR and PDF Generation** — Generate QR codes for certificate checks and downloadable PDF documents.
- **Audit Trail** — Track important actions, including login attempts, verification requests, exports, and record changes.
- **Reports and Exports** — Generate supported reports while masking student identifiers.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 14 | Web application and API routes |
| React 18 | User interface |
| TypeScript | Application logic and type safety |
| Tailwind CSS | Styling |
| Prisma ORM | Database access |
| SQLite | Local development database |
| Recharts | Dashboard visualisations |
| PapaParse | CSV processing |
| `@react-pdf/renderer` | PDF generation |
| `qrcode` | QR code generation |

## Getting Started

### Prerequisites

- Node.js 18.18 or later
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repository>.git
cd <your-repository>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file.

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux**

```bash
cp .env.example .env
```

The example configuration is intended for local development only.

### 4. Set up the database

```bash
npm run db:push
npm run db:seed
```

This creates the local database schema and populates it with synthetic demonstration data.

### 5. Start the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Useful Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the application |
| `npm start` | Start the production server |
| `npm run typecheck` | Check TypeScript types |
| `npm run db:push` | Apply the Prisma schema and generate Prisma Client |
| `npm run db:seed` | Populate the database with demo data |
| `npm run db:preview` | Preview seeded records, rule results, and risk scores |
| `npm run db:reset` | Reset the database and reseed it; existing local data will be lost |

## Project Structure

```text
app/
  (app)/              Dashboard and application pages
  api/v1/             Versioned API routes
  c/[token]/          Public certificate-check page
  login/              Login page

components/            Reusable UI components

lib/
  rules/               Data validation rules
  upload/              CSV processing and validation
  pdf/                 PDF-related functionality
  auth.ts              Authentication and access control
  audit.ts              Audit logging
  risk.ts               Institution risk scoring
  abc.ts                Mock ABC/DigiLocker adapter

prisma/
  schema.prisma        Database schema
  seed.ts              Database seeding

scripts/               Development utilities
```

## Current Limitations

Pramaan is a hackathon prototype, and some integrations are simulated:

- APAAR checksum validation uses a mock implementation, not the official checksum specification.
- ABC/DigiLocker verification is simulated; no live government verification takes place.
- The application uses fictional student and institution data.
- The institution risk score is an experimental indicator and is not an official AICTE rating.
- Demo login is intended only for local demonstrations.

The application should not be used to verify real student identities or process real student records in its current form. A production deployment would require approved integrations, stronger deployment security, appropriate consent and privacy controls, and further testing.

For additional implementation notes and production requirements, see [`NOTES.md`](NOTES.md).

## Team
**Team Deep Thinkers**  

## License

No license has been specified. All rights remain with the respective copyright holders unless a license is added to this repository.
