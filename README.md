# CARELOOP — Closing the Screening-to-Care Loop

A comprehensive healthcare coordination platform designed to ensure that no patient screening result is lost to follow-up. CARELOOP tracks patients from initial screening through specialist referrals, appointment scheduling, attendance, and verified clinical closure.

---

## Vercel deployment

The root `vercel.json` deploys Member 1 as the `member1` Vercel service and sends all public paths to it. Member 3 is a feature module embedded in Member 1, not a standalone deployable service. Member 2 remains a Cloudflare Worker backed by Cloudflare D1; it is not deployed as a Vercel service.

Set `VITE_API_BASE_URL` in the Vercel project's build environment to the deployed Member 2 API base URL, including `/api` (for example, `https://careloop-api.example.workers.dev/api`). The frontend calls this public API directly from the browser; it does not use a Vercel service binding. `VITE_API_BASE_URL` is bundled into browser code, so it must not contain secrets. Configure the Worker and its D1 database separately.

For the standalone browser walkthrough, set `VITE_CARELOOP_BROWSER_DEMO=true` and build Member 1 as below. The Vercel service build does not enable browser-demo mode; without `VITE_API_BASE_URL`, the connected backend is not configured.

To reproduce a connected deployment build locally from the repository root, set `VITE_API_BASE_URL` to a running Member 2 API first:

```powershell
npm ci --prefix 'Member 1'
$env:VITE_API_BASE_URL = 'http://localhost:8787/api'
npm run build --prefix 'Member 1'
npm run preview --prefix 'Member 1'
```

## Architecture & Technology Stack

The project operates on a unified, high-performance TypeScript stack:

- **Backend & Care Coordination Engine (Member 2):** Cloudflare Workers (TypeScript), Cloudflare D1 (SQLite), Zod validation, and Vitest.
- **Admin, Monitoring & Analytics Dashboard (Member 3):** React, Vite, TypeScript, Tailwind CSS, and Recharts.
- **Patient Experience & Web Application (Member 1):** Mobile-first React + Vite TypeScript webapp.

## Repository Structure

```text
Care-loop/
├── README.md                  # Shared project overview and setup
├── .gitignore                 # Shared repository ignore rules
├── Member 1/                  # Patient portal and frontend application (React + Vite)
│   ├── package.json           # Frontend dependencies, build and test scripts
│   ├── index.html             # Vite HTML entry point
│   ├── vite.config.ts         # Frontend build configuration
│   └── src/                   # Pages, components, services, tests and demo data
├── Member 2/                  # Backend & Care Coordination Engine (Cloudflare Workers + D1)
│   ├── README.md              # Backend documentation & API contracts
│   ├── package.json           # Backend dependencies and test scripts
│   ├── wrangler.toml          # Cloudflare Workers configuration
│   ├── src/                   # Database, services, rules, and API router
│   └── tests/                 # Vitest suites
└── Member 3/                  # Admin, Monitoring & Analytics Workspace (React + Vite)
    ├── README.md              # Frontend module documentation
    └── src/                   # Admin UI components, dashboards, and demo data
```

---

## Quick Start

### 1. Frontend application (Member 1)
```bash
cd "Member 1"
npm ci
npm run build
npm test
npm run dev
```

### 2. Backend & Care Coordination Workflows (Member 2)
```bash
cd "Member 2"
npm install
npm test            # Run backend tests
npm run build       # Verify TypeScript compilation and bundle
npm run dev         # Or 'npx wrangler dev' to run locally on http://localhost:8787
```

### 3. Admin Workspace (Member 3)
Member 3 is a feature module designed to be embedded in a host React + Vite application. It provides synthetic demo mode by default and connects to the Member 2 backend when configured:
```env
VITE_CARELOOP_USE_DEMO_DATA=false
VITE_CARELOOP_API_URL=http://localhost:8787
```

---

## Connected three-member demo (local)

1. Use **Node.js 22**. In `Member 2/`, run `npm ci` and `npm run dev`. The seeded SQLite backend starts at `http://localhost:8787`.
2. In `Member 1/`, run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`.
3. Open the Vite URL and choose a **synthetic demo role**. The demo password is not an actual authentication mechanism.
4. The Member 1 admin sidebar includes Member 3 monitoring, escalations, at-risk cases and care outcomes, backed by Member 2's API.
5. With `VITE_API_BASE_URL` configured, both Member 1 and Member 3 automatically use the connected backend; `VITE_CARELOOP_API_URL` is optional if both share the same API origin. Set `VITE_CARELOOP_USE_DEMO_DATA=true` to force Member 3's standalone sample dashboard. With no backend URL configured, both modules retain their original mock modes.

**Known demo boundaries:** use fictional data only. Connected-mode synthetic patient registration and screening-case creation are supported; real account authentication is not implemented. The backend uses a synthetic demo role token and a **file-backed SQLite database** (`Member 2/careloop-local.sqlite`) that preserves local edits across restarts. To reset the demo, stop the backend and delete that SQLite file; startup recreates the seed data. Set `DATABASE_PATH=:memory:` for an intentionally disposable session. Cloudflare deployment requires configuring a real D1 database binding and loading the schema/seed. Do not use this setup for real healthcare records.

---

## Safety & Compliance Invariants

1. **Synthetic Demo Data Only:** The repository contains only synthetic test data with fictional patients and care workers. No identifiable patient data is committed.
2. **Deterministic Triage & Clinical Disclaimers:** Priority and target time-to-care SLA calculations are transparent and deterministic. No automated medical diagnoses or treatment recommendations are made. Ambiguous or urgent results route directly to qualified clinical review.
3. **Verified Closure Invariant:** Referral creation or appointment attendance alone does not close a case. Verified closure strictly requires an authorized clinician or administrator, documented clinical outcome, and evidence notes.
4. **Immutable Audit Trails:** Every important state mutation records an append-only event in the case timeline.

---

## Frontend application setup and demo notes

CARELOOP is a responsive React, Vite, and TypeScript prototype for coordinating a synthetic screening case through notification, patient acknowledgment, referral, appointment, follow-up, clinical review, and verified closure.

## Run locally

```powershell
cd "Member 1"
npm ci
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Run `npm run build` to type-check and create a production build; run `npm test` for the focused patient-data and case-history tests.

## Demo access

Open **Sign in**, choose a role, and enter any password. Demo credentials and mock responses are explicitly enabled only when `VITE_API_BASE_URL` is unset. The demo has no public self-registration and does not create real accounts. Demo users:

| Role | Email |
| --- | --- |
| Administrator | `admin@careloop.demo` |
| Doctor | `doctor@careloop.demo` |
| Care coordinator | `worker@careloop.demo` |
| Patient | `patient@careloop.demo` |

No demo passwords are embedded or persisted. The patient role is linked to one synthetic case (`CL-2048`). The portal only presents that patient's scoped case information and omits internal clinical notes. Patient notifications can be acknowledged once; acknowledgment is recorded as a separate case-history event. Help requests stay in the in-app workflow.

All demo records and dashboard/analytics figures are synthetic and illustrative. The mock service layer keeps mutations in memory; they reset when the page is reloaded and are not a durable source of truth. Do not enter real patient information.

## API configuration

Inside `Member 1/`, copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend base URL, for example `http://localhost:8787/api`. The API client adds the access token as a bearer token and reports API errors rather than silently switching to mock responses. The frontend service layer is in `Member 1/src/services/`; synthetic records and recorded demo case events are in `Member 1/src/mocks/`.

The patient case service expects `GET /patient/cases`, `GET /cases/:id/timeline`, `POST /cases/:id/acknowledge`, and `POST /cases/:id/help-requests`. Case closure uses `POST /cases/:id/closure` with an outcome and evidence note. These paths must be agreed with and implemented by the API owner; the frontend does not transition production case status or authorize access.

The backend must enforce authentication, role permissions, and patient-level authorization independently of frontend route guards. The frontend role guards are for navigation and UX only.

## Care closure

Sending or acknowledging a notification, creating a referral, scheduling an appointment, or completing a follow-up does not close a case. The staff closure action requires an explicit confirmation and a written evidence note; the mock records the outcome, verifying actor, timestamp, and timeline event. A production backend must enforce authorized verification, persist the evidence, and return the verified-closure record before the UI presents the case as closed.

## Simulated KPI definitions

The current admin charts are illustrative and are **not computed from the demo patient list or a live database**. For API integration, the specification defines:

| KPI | Definition |
| --- | --- |
| Notification acknowledgment rate | Acknowledged in-app notifications ÷ notifications issued. |
| Referral completion rate | Referrals marked completed ÷ referrals created; define cancelled/rejected treatment consistently. |
| Appointment attendance rate | Appointments attended ÷ appointments due with a recorded attendance outcome. |
| Average time to consultation | Elapsed time from screening record to consultation timestamp, averaged across eligible cases. |
| Overdue case count | Open cases whose required next-action due date has passed. |
| Verified closure rate | Cases with authorized verification ÷ cases eligible for closure. |

Use database/API aggregates for production metrics and make numerator/denominator rules visible. Do not treat the sample figures as operational results.
