# CARELOOP — Closing the Screening-to-Care Loop

A comprehensive healthcare coordination platform designed to ensure that no patient screening result is lost to follow-up. CARELOOP tracks patients from initial screening through specialist referrals, appointment scheduling, attendance, and verified clinical closure.

---

## Architecture & Technology Stack

The project operates on a unified, high-performance TypeScript stack:

- **Backend & Care Coordination Engine (Member 2):** Cloudflare Workers (TypeScript), Cloudflare D1 (SQLite), Zod validation, and Vitest.
- **Admin, Monitoring & Analytics Dashboard (Member 3):** React, Vite, TypeScript, Tailwind CSS, and Recharts.
- **Patient Experience & Web Application (Member 1):** Mobile-first React + Vite TypeScript webapp.

### Stack Discrepancy Note & Resolution
While early project notes mentioned self-hosted n8n and Supabase/Postgres, the codebase establishes **Cloudflare Workers + Cloudflare D1 (SQLite) + React/Vite/TypeScript** as authoritative. This edge-native architecture ensures deterministic sub-millisecond response times, zero external database hosting friction, parameterized SQL safety, and full local testability without requiring external containers or SaaS services.

---

## Repository Structure

```text
Care-loop/
├── README.md                  # Project overview & architecture
├── Member 2/                  # Backend & Care Coordination Engine (Cloudflare Workers + D1)
│   ├── README.md              # Backend documentation & API contracts
│   ├── package.json           # Backend dependencies and test scripts
│   ├── wrangler.toml          # Cloudflare Workers configuration
│   ├── src/                   # Database, services, rules, and API router
│   └── tests/                 # 12 Vitest test suites (47 tests)
└── Member 3/                  # Admin, Monitoring & Analytics Workspace (React + Vite)
    ├── README.md              # Frontend module documentation
    └── src/                   # Admin UI components, dashboards, and demo data
```

---

## Quick Start

### 1. Backend & Care Coordination Workflows (Member 2)
```bash
cd "Member 2"
npm install
npm test            # Run all 12 test suites (47 tests)
npm run build       # Verify TypeScript compilation and bundle
npm run dev         # Or 'npx wrangler dev' to run locally on http://localhost:8787
```

### 2. Admin Workspace (Member 3)
Member 3 is a feature module designed to be embedded in a host React + Vite application. It provides synthetic demo mode by default and connects to the Member 2 backend when configured:
```env
VITE_CARELOOP_USE_DEMO_DATA=false
VITE_CARELOOP_API_URL=http://localhost:8787
```

---

## Safety & Compliance Invariants

1. **Synthetic Demo Data Only:** The repository contains only synthetic test data with fictional patients and care workers. No identifiable patient data is committed.
2. **Deterministic Triage & Clinical Disclaimers:** Priority and target time-to-care SLA calculations are transparent and deterministic. No automated medical diagnoses or treatment recommendations are made. Ambiguous or urgent results route directly to qualified clinical review.
3. **Verified Closure Invariant:** Referral creation or appointment attendance alone does not close a case. Verified closure strictly requires an authorized clinician or administrator, documented clinical outcome, and evidence notes.
4. **Immutable Audit Trails:** Every important state mutation records an append-only event in the case timeline.
