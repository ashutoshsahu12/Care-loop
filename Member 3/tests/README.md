# Member 3 verification checklist

These checks are intended for the host React + Vite application after importing `AdminApp`.

## Admin workspace

- [ ] Workspace renders without console errors.
- [ ] Sidebar navigation switches between all five sections.
- [ ] Mobile menu opens, closes, and closes after a section is selected.
- [ ] Demo mode is visibly labelled as **DEMO DATA**.

## Dashboard

- [ ] Six KPI cards render values from the overview service.
- [ ] Recent escalations render patient references, reasons, owner and priority.
- [ ] Loading and API error states are understandable.

## Case monitoring

- [ ] Search filters by patient reference, case ID, care worker and next action.
- [ ] Status filter returns only matching cases.
- [ ] Priority filter returns only matching cases.
- [ ] Empty results show a clear empty state.
- [ ] Missing care worker and due date values are handled.

## Escalations and follow-up risk

- [ ] Escalation rows show reason, responsible person, overdue days and priority.
- [ ] At-risk rows show every risk reason and a suggested next action.
- [ ] Empty and error states render correctly.

## Analytics

- [ ] KPI values render with the correct units.
- [ ] Trend charts render when data exists.
- [ ] Empty trend data displays an empty state.

## Backend integration

- [ ] Confirm all endpoint paths and response field names with Member 2.
- [ ] Set `VITE_CARELOOP_USE_DEMO_DATA=false` only after the backend is reachable.
- [ ] Configure `VITE_CARELOOP_API_URL` to the agreed API base URL.
- [ ] Verify authentication/session handling with the backend team.
- [ ] Test using synthetic records only.

## Scope boundary

All implementation and verification notes for this contribution must remain under `Member 3/`. Do not add or modify root configuration, shared application files, or another member's directory without explicit approval.
