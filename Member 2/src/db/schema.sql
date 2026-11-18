-- CARELOOP Database Schema (Cloudflare D1 / SQLite)

PRAGMA foreign_keys = ON;

-- Users (clinicians, care workers, admin, patients)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('admin', 'clinician', 'care_worker', 'patient')),
  phone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  patient_reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Screening Results
CREATE TABLE IF NOT EXISTS screening_results (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  screening_type TEXT NOT NULL,
  result_value TEXT NOT NULL,
  score REAL,
  urgency TEXT NOT NULL CHECK(urgency IN ('routine', 'urgent', 'critical')),
  status TEXT NOT NULL CHECK(status IN ('pending_review', 'reviewed', 'escalated')),
  raw_payload TEXT,
  clinician_notes TEXT,
  submitted_by_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);

-- Cases
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  screening_result_id TEXT REFERENCES screening_results(id),
  status TEXT NOT NULL CHECK(status IN ('screening', 'referred', 'appointment_scheduled', 'in_care', 'completed', 'overdue', 'unassigned')),
  priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  owner_id TEXT REFERENCES users(id),
  assigned_care_worker_name TEXT,
  next_action TEXT NOT NULL,
  due_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  referring_provider_id TEXT NOT NULL REFERENCES users(id),
  target_facility TEXT NOT NULL,
  specialty TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK(urgency IN ('routine', 'urgent', 'critical')),
  status TEXT NOT NULL CHECK(status IN ('pending_acceptance', 'accepted', 'rejected', 'completed', 'cancelled')),
  notes TEXT,
  handoff_clinician_id TEXT REFERENCES users(id),
  handoff_notes TEXT,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  referral_id TEXT REFERENCES referrals(id),
  scheduled_time TEXT NOT NULL,
  facility TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('scheduled', 'attended', 'no_show', 'cancelled', 'rescheduled')),
  attendance_notes TEXT,
  recorded_by_id TEXT REFERENCES users(id),
  recorded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('screening_result', 'referral_sent', 'appointment_reminder', 'care_worker_escalation')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('sent', 'delivered', 'acknowledged')),
  acknowledged_at TEXT,
  created_at TEXT NOT NULL
);

-- Follow-Up Tasks
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  assigned_to_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TEXT,
  completed_by_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Case Events (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS case_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  summary TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);

-- Verified Closure Records
CREATE TABLE IF NOT EXISTS closure_records (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  verification_actor_id TEXT NOT NULL REFERENCES users(id),
  verification_actor_role TEXT NOT NULL CHECK(verification_actor_role IN ('clinician', 'admin')),
  evidence_note TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Indexes for efficient queries and analytics
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner_id);
CREATE INDEX IF NOT EXISTS idx_cases_due_at ON cases(due_at);
CREATE INDEX IF NOT EXISTS idx_cases_patient ON cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_case_events_case_created ON case_events(case_id, created_at);
CREATE INDEX IF NOT EXISTS idx_referrals_case ON referrals(case_id);
CREATE INDEX IF NOT EXISTS idx_appointments_case ON appointments(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_case ON follow_up_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_case_recipient ON notifications(case_id, recipient_id);
