# Member 3 — Admin, Monitoring & Analytics

This directory contains the Member 3 contribution to CARELOOP — Closing the Screening-to-Care Loop.

## Modules

1. **Admin Dashboard** — overview KPIs and recent escalations.
2. **Case Monitoring** — searchable case list with status and priority filters.
3. **Escalation Monitoring** — overdue referrals, missed appointments, unacknowledged notifications, and unresolved cases.
4. **Lost-to-Follow-Up Monitoring** — rule-based risk flags and suggested next actions supplied by the API.
5. **Analytics & Reports** — referral, attendance, notification, consultation-time, and closure metrics.

## Current source layout

```text
Member 3/
├── README.md
└── src/
    ├── features/
    │   └── admin/
    │       ├── AdminDashboard.tsx
    │       ├── CaseMonitoring.tsx
    │       ├── EscalationMonitoring.tsx
    │       ├── LostToFollowUp.tsx
    │       ├── Analytics.tsx
    │       ├── index.ts
    │       ├── components/
    │       │   ├── StatCard.tsx
    │       │   ├── CaseTable.tsx
    │       │   ├── AlertList.tsx
    │       │   └── AnalyticsCharts.tsx
    │       └── services/
    │           └── adminService.ts
    ├── services/
    │   └── api.ts
    └── types/
        └── admin.ts
```

## API contract expected by this module

- `GET /api/admin/overview`
- `GET /api/admin/cases`
- `GET /api/admin/escalations`
- `GET /api/admin/at-risk`
- `GET /api/admin/analytics`

These endpoints are expected contracts only; they have not been confirmed as implemented by the backend team. Configure `VITE_CARELOOP_API_URL` in the host Vite application when the API base URL is known.

## Integration notes

- The source is written for a React + TypeScript host application.
- The charts component uses Recharts.
- UI classes use Tailwind CSS utility classes.
- These files are a feature module; the host application must provide React, Tailwind CSS, and Recharts.
- Coordinate response shapes and field names with the backend team before integration.
- Use synthetic demonstration data only. Never commit real patient or medical information.
- All work in this contribution must remain inside `Member 3/`.
