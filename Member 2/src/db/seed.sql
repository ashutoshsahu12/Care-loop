-- Synthetic Demonstration Dataset for CARELOOP
-- strictly synthetic / fictional data for hackathon demo purposes

-- Users
INSERT OR IGNORE INTO users (id, name, email, role, phone, created_at, updated_at) VALUES
('usr-admin-1', 'Dr. Vikram Patel', 'admin@careloop.local', 'admin', '+91 98765 43210', '2026-11-01T08:00:00Z', '2026-11-01T08:00:00Z'),
('usr-clin-1', 'Dr. Neha Verma', 'n.verma@careloop.local', 'clinician', '+91 98765 43211', '2026-11-01T08:00:00Z', '2026-11-01T08:00:00Z'),
('usr-clin-2', 'Dr. Rajesh Gupta', 'r.gupta@careloop.local', 'clinician', '+91 98765 43212', '2026-11-01T08:00:00Z', '2026-11-01T08:00:00Z'),
('usr-cw-1', 'A. Sharma', 'a.sharma@careloop.local', 'care_worker', '+91 98765 43213', '2026-11-01T08:00:00Z', '2026-11-01T08:00:00Z'),
('usr-cw-2', 'R. Kumar', 'r.kumar@careloop.local', 'care_worker', '+91 98765 43214', '2026-11-01T08:00:00Z', '2026-11-01T08:00:00Z'),
('usr-cw-3', 'S. Iyer', 's.iyer@careloop.local', 'care_worker', '+91 98765 43215', '2026-11-01T08:00:00Z', '2026-11-01T08:00:00Z'),
('usr-cw-4', 'M. Das', 'm.das@careloop.local', 'care_worker', '+91 98765 43216', '2026-11-01T08:00:00Z', '2026-11-01T08:00:00Z'),
('usr-pt-1001', 'Kavita Sundaram', 'kavita.s@demo.local', 'patient', '+91 98765 01001', '2026-11-01T08:00:00Z', '2026-11-01T08:00:00Z'),
('usr-pt-1006', 'Dinesh Mohan', 'dinesh.m@demo.local', 'patient', '+91 98765 01006', '2026-11-01T08:00:00Z', '2026-11-01T08:00:00Z');

-- Patients
INSERT OR IGNORE INTO patients (id, patient_reference, name, date_of_birth, gender, phone, email, address, created_at, updated_at) VALUES
('pat-1001', 'CL-P-1001', 'Kavita Sundaram', '1978-04-12', 'female', '+91 98765 01001', 'kavita.s@demo.local', '12 Lake View Rd, Bangalore', '2026-11-10T08:00:00Z', '2026-11-10T08:00:00Z'),
('pat-1002', 'CL-P-1002', 'Sunil Joshi', '1965-09-23', 'male', '+91 98765 01002', 'sunil.j@demo.local', '45 Gandhi Nagar, Mysore', '2026-11-10T08:30:00Z', '2026-11-10T08:30:00Z'),
('pat-1003', 'CL-P-1003', 'Meena Kumari', '1982-11-05', 'female', '+91 98765 01003', 'meena.k@demo.local', '88 Ring Road, Mandya', '2026-11-11T09:00:00Z', '2026-11-11T09:00:00Z'),
('pat-1004', 'CL-P-1004', 'Arun Swaminathan', '1959-01-30', 'male', '+91 98765 01004', 'arun.s@demo.local', '102 Anna Salai, Chennai', '2026-11-05T10:00:00Z', '2026-11-05T10:00:00Z'),
('pat-1005', 'CL-P-1005', 'Pooja Hegde', '1990-07-14', 'female', '+91 98765 01005', 'pooja.h@demo.local', '34 MG Road, Mangalore', '2026-11-06T11:00:00Z', '2026-11-06T11:00:00Z'),
('pat-1006', 'CL-P-1006', 'Dinesh Mohan', '1972-03-18', 'male', '+91 98765 01006', 'dinesh.m@demo.local', '77 Hospital Cross, Hubli', '2026-11-01T09:00:00Z', '2026-11-01T09:00:00Z'),
('pat-1007', 'CL-P-1007', 'Ananya Banerjee', '1985-12-01', 'female', '+91 98765 01007', 'ananya.b@demo.local', '19 Station Rd, Belgaum', '2026-11-12T08:00:00Z', '2026-11-12T08:00:00Z'),
('pat-1008', 'CL-P-1008', 'Rajendra Prasad', '1961-06-25', 'male', '+91 98765 01008', 'rajendra.p@demo.local', '62 Park St, Kolkata', '2026-11-08T09:30:00Z', '2026-11-08T09:30:00Z'),
('pat-1009', 'CL-P-1009', 'Lakshmi Narayanan', '1975-08-09', 'female', '+91 98765 01009', 'lakshmi.n@demo.local', '5 Temple View, Madurai', '2026-11-14T10:00:00Z', '2026-11-14T10:00:00Z'),
('pat-1010', 'CL-P-1010', 'Vikramaditya Rao', '1954-05-15', 'male', '+91 98765 01010', 'vikram.r@demo.local', '140 Bypass Rd, Trichy', '2026-11-02T11:00:00Z', '2026-11-02T11:00:00Z'),
('pat-1011', 'CL-P-1011', 'Fatima Begum', '1980-02-28', 'female', '+91 98765 01011', 'fatima.b@demo.local', '21 Charminar East, Hyderabad', '2026-11-03T10:00:00Z', '2026-11-03T10:00:00Z'),
('pat-1012', 'CL-P-1012', 'Gopal Krishnan', '1968-10-10', 'male', '+91 98765 01012', 'gopal.k@demo.local', '9 Hill Rd, Shimoga', '2026-11-13T12:00:00Z', '2026-11-13T12:00:00Z');

-- Screening Results
INSERT OR IGNORE INTO screening_results (id, patient_id, screening_type, result_value, score, urgency, status, raw_payload, clinician_notes, submitted_by_id, created_at) VALUES
('scr-1001', 'pat-1001', 'cardiovascular', 'Elevated BP: 142/92 mmHg', 142.0, 'routine', 'pending_review', '{"systolic": 142, "diastolic": 92}', 'Stage 1 hypertension flagged during community screening camp.', 'usr-cw-1', '2026-11-16T09:00:00Z'),
('scr-1002', 'pat-1002', 'diabetic_retinopathy', 'Moderate NPDR detected', 2.0, 'urgent', 'reviewed', '{"retina_grade": "moderate_npdr"}', 'Microaneurysms and hemorrhages present in left eye.', 'usr-clin-1', '2026-11-12T10:00:00Z'),
('scr-1003', 'pat-1003', 'cervical_cancer', 'VIA Negative / Routine Follow-up', 0.0, 'routine', 'reviewed', '{"via_status": "negative"}', 'Normal transformation zone, re-screen in 3 years.', 'usr-clin-2', '2026-11-14T11:00:00Z'),
('scr-1004', 'pat-1004', 'cardiovascular', 'Hypertensive Crisis: 195/115 mmHg', 195.0, 'critical', 'escalated', '{"systolic": 195, "diastolic": 115}', 'Urgent clinical consultation required immediately.', 'usr-cw-4', '2026-11-10T07:30:00Z'),
('scr-1005', 'pat-1005', 'diabetic_retinopathy', 'Mild NPDR - Resolved', 1.0, 'routine', 'reviewed', '{"retina_grade": "mild_npdr"}', 'Glycemic control improved, repeat screening next year.', 'usr-clin-1', '2026-11-06T12:00:00Z'),
('scr-1006', 'pat-1006', 'diabetic_retinopathy', 'Severe NPDR / Suspected PDR', 3.0, 'critical', 'escalated', '{"retina_grade": "severe_npdr"}', 'Neovascularization risk, urgent vitreo-retinal referral needed.', 'usr-clin-1', '2026-11-08T09:00:00Z'),
('scr-1007', 'pat-1007', 'cardiovascular', 'Stage 2 Hypertension: 168/102 mmHg', 168.0, 'urgent', 'pending_review', '{"systolic": 168, "diastolic": 102}', 'Needs care worker assignment and medication review.', 'usr-cw-2', '2026-11-15T11:00:00Z'),
('scr-1008', 'pat-1008', 'diabetic_retinopathy', 'Macular Edema', 2.5, 'urgent', 'reviewed', '{"macular_edema": true}', 'Referred to District Eye Hospital.', 'usr-clin-2', '2026-11-11T09:00:00Z'),
('scr-1009', 'pat-1009', 'cervical_cancer', 'VIA Positive / Atypical', 2.0, 'routine', 'pending_review', '{"via_status": "positive"}', 'Colposcopy triage recommended.', 'usr-cw-4', '2026-11-16T09:30:00Z'),
('scr-1010', 'pat-1010', 'cardiovascular', 'Symptomatic Bradycardia with High BP', 170.0, 'critical', 'escalated', '{"systolic": 170, "heart_rate": 44}', 'Unassigned critical case requiring immediate follow-up owner.', 'usr-clin-1', '2026-11-07T12:00:00Z'),
('scr-1011', 'pat-1011', 'cardiovascular', 'Normotensive post-medication', 120.0, 'routine', 'reviewed', '{"systolic": 120, "diastolic": 78}', 'BP stabilized after 4-week titration.', 'usr-clin-2', '2026-11-03T11:00:00Z'),
('scr-1012', 'pat-1012', 'diabetic_retinopathy', 'Mild NPDR with Glycemic Follow-up', 1.0, 'routine', 'reviewed', '{"retina_grade": "mild_npdr"}', 'Ophthalmology appointment scheduled.', 'usr-cw-2', '2026-11-13T13:00:00Z');

-- Cases (matching Member 3 exact demo case data)
INSERT OR IGNORE INTO cases (id, patient_id, screening_result_id, status, priority, owner_id, assigned_care_worker_name, next_action, due_at, last_activity_at, created_at, updated_at) VALUES
('CL-1001', 'pat-1001', 'scr-1001', 'screening', 'medium', 'usr-cw-1', 'A. Sharma', 'Review screening result', '2026-11-18', '2026-11-16T09:30:00Z', '2026-11-16T09:00:00Z', '2026-11-16T09:30:00Z'),
('CL-1002', 'pat-1002', 'scr-1002', 'referred', 'high', 'usr-cw-2', 'R. Kumar', 'Confirm referral acceptance', '2026-11-15', '2026-11-12T11:15:00Z', '2026-11-10T08:30:00Z', '2026-11-12T11:15:00Z'),
('CL-1003', 'pat-1003', 'scr-1003', 'appointment_scheduled', 'low', 'usr-cw-3', 'S. Iyer', 'Confirm appointment attendance', '2026-11-20', '2026-11-16T14:20:00Z', '2026-11-11T09:00:00Z', '2026-11-16T14:20:00Z'),
('CL-1004', 'pat-1004', 'scr-1004', 'in_care', 'critical', 'usr-cw-4', 'M. Das', 'Record follow-up outcome', '2026-11-14', '2026-11-10T08:00:00Z', '2026-11-05T10:00:00Z', '2026-11-10T08:00:00Z'),
('CL-1005', 'pat-1005', 'scr-1005', 'completed', 'low', 'usr-cw-1', 'A. Sharma', 'Verify case closure', '2026-11-13', '2026-11-13T16:45:00Z', '2026-11-06T11:00:00Z', '2026-11-13T16:45:00Z'),
('CL-1006', 'pat-1006', 'scr-1006', 'overdue', 'critical', 'usr-cw-2', 'R. Kumar', 'Contact referral centre', '2026-11-09', '2026-11-08T10:10:00Z', '2026-11-01T09:00:00Z', '2026-11-08T10:10:00Z'),
('CL-1007', 'pat-1007', 'scr-1007', 'unassigned', 'high', NULL, NULL, 'Assign a care worker', '2026-11-19', '2026-11-15T12:00:00Z', '2026-11-12T08:00:00Z', '2026-11-15T12:00:00Z'),
('CL-1008', 'pat-1008', 'scr-1008', 'referred', 'high', 'usr-cw-3', 'S. Iyer', 'Check referral acknowledgement', '2026-11-16', '2026-11-11T09:45:00Z', '2026-11-08T09:30:00Z', '2026-11-11T09:45:00Z'),
('CL-1009', 'pat-1009', 'scr-1009', 'screening', 'medium', 'usr-cw-4', 'M. Das', 'Schedule initial consultation', '2026-11-22', '2026-11-16T10:00:00Z', '2026-11-14T10:00:00Z', '2026-11-16T10:00:00Z'),
('CL-1010', 'pat-1010', 'scr-1010', 'in_care', 'critical', NULL, NULL, 'Assign follow-up owner', '2026-11-12', '2026-11-07T13:30:00Z', '2026-11-02T11:00:00Z', '2026-11-07T13:30:00Z'),
('CL-1011', 'pat-1011', 'scr-1011', 'completed', 'low', 'usr-cw-1', 'A. Sharma', 'Archive verified record', '2026-11-10', '2026-11-10T15:10:00Z', '2026-11-03T10:00:00Z', '2026-11-10T15:10:00Z'),
('CL-1012', 'pat-1012', 'scr-1012', 'appointment_scheduled', 'medium', 'usr-cw-2', 'R. Kumar', 'Send appointment reminder', '2026-11-18', '2026-11-16T17:00:00Z', '2026-11-13T12:00:00Z', '2026-11-16T17:00:00Z');

-- Referrals
INSERT OR IGNORE INTO referrals (id, case_id, referring_provider_id, target_facility, specialty, urgency, status, notes, handoff_clinician_id, handoff_notes, acknowledged_at, created_at, updated_at) VALUES
('ref-1002', 'CL-1002', 'usr-clin-1', 'District Ophthalmology Hospital', 'Ophthalmology', 'urgent', 'pending_acceptance', 'Moderate NPDR requiring laser photocoagulation assessment.', 'usr-clin-2', 'Referred to Dr. Gupta at District Hospital with retinal photography attachment.', NULL, '2026-11-12T11:00:00Z', '2026-11-12T11:15:00Z'),
('ref-1006', 'CL-1006', 'usr-clin-1', 'Regional Tertiary Eye Institute', 'Vitreoretinal Surgery', 'critical', 'pending_acceptance', 'Severe NPDR with sight-threatening risk.', 'usr-clin-2', 'Urgent handoff notes: patient has bilateral vision deterioration.', NULL, '2026-11-08T09:30:00Z', '2026-11-08T10:10:00Z'),
('ref-1008', 'CL-1008', 'usr-clin-2', 'District Hospital Eye Wing', 'Ophthalmology', 'urgent', 'pending_acceptance', 'Macular edema treatment protocol.', NULL, NULL, NULL, '2026-11-11T09:30:00Z', '2026-11-11T09:45:00Z');

-- Appointments
INSERT OR IGNORE INTO appointments (id, case_id, referral_id, scheduled_time, facility, provider_name, status, attendance_notes, recorded_by_id, recorded_at, created_at, updated_at) VALUES
('apt-1003', 'CL-1003', NULL, '2026-11-20T10:00:00Z', 'Community Health Centre Mandya', 'Dr. Neha Verma', 'scheduled', NULL, NULL, NULL, '2026-11-16T14:20:00Z', '2026-11-16T14:20:00Z'),
('apt-1004', 'CL-1004', NULL, '2026-11-09T14:00:00Z', 'Chennai General Hospital', 'Dr. Sundaram', 'no_show', 'Patient did not attend due to transport disruption. Rescheduling needed.', 'usr-cw-4', '2026-11-10T08:00:00Z', '2026-11-06T09:00:00Z', '2026-11-10T08:00:00Z'),
('apt-1012', 'CL-1012', NULL, '2026-11-18T11:30:00Z', 'District Hospital Shimoga', 'Dr. Rajesh Gupta', 'scheduled', NULL, NULL, NULL, '2026-11-16T16:00:00Z', '2026-11-16T16:00:00Z');

-- Notifications
INSERT OR IGNORE INTO notifications (id, case_id, recipient_id, recipient_role, type, title, message, status, acknowledged_at, created_at) VALUES
('notif-1001', 'CL-1001', 'usr-pt-1001', 'patient', 'screening_result', 'Screening Summary Available', 'Your cardiovascular screening summary is ready for review.', 'delivered', NULL, '2026-11-16T09:15:00Z'),
('notif-1008', 'CL-1008', 'usr-cw-3', 'care_worker', 'referral_sent', 'Referral Acknowledgement Pending', 'Referral for CL-P-1008 remains unacknowledged by receiving centre.', 'sent', NULL, '2026-11-14T12:00:00Z');

-- Follow-up Tasks
INSERT OR IGNORE INTO follow_up_tasks (id, case_id, assigned_to_id, title, description, due_date, status, completed_at, completed_by_id, created_at, updated_at) VALUES
('tsk-1001', 'CL-1001', 'usr-cw-1', 'Review dietary log and schedule repeat BP', 'Check sodium reduction compliance and recheck BP.', '2026-11-18', 'pending', NULL, NULL, '2026-11-16T09:30:00Z', '2026-11-16T09:30:00Z'),
('tsk-1004', 'CL-1004', 'usr-cw-4', 'Home visit for missed consultation', 'Conduct home visit to verify patient condition after missed cardiology appointment.', '2026-11-15', 'in_progress', NULL, NULL, '2026-11-10T08:00:00Z', '2026-11-10T08:00:00Z'),
('tsk-1006', 'CL-1006', 'usr-cw-2', 'Escalate referral to District Medical Officer', 'Physical handoff and confirmation at tertiary center.', '2026-11-10', 'pending', NULL, NULL, '2026-11-08T10:10:00Z', '2026-11-08T10:10:00Z');

-- Case Events (Immutable Audit Log)
INSERT OR IGNORE INTO case_events (id, case_id, actor_id, actor_role, event_type, from_status, to_status, summary, metadata, created_at) VALUES
('evt-1001-1', 'CL-1001', 'usr-cw-1', 'care_worker', 'case_created', NULL, 'screening', 'Case created following community BP screening.', '{"screening_id": "scr-1001"}', '2026-11-16T09:00:00Z'),
('evt-1001-2', 'CL-1001', 'usr-cw-1', 'care_worker', 'case_assigned', 'screening', 'screening', 'Assigned case to A. Sharma.', '{"owner_id": "usr-cw-1"}', '2026-11-16T09:30:00Z'),
('evt-1002-1', 'CL-1002', 'usr-clin-1', 'clinician', 'case_created', NULL, 'screening', 'Case created from diabetic retinopathy screening.', '{"screening_id": "scr-1002"}', '2026-11-10T08:30:00Z'),
('evt-1002-2', 'CL-1002', 'usr-clin-1', 'clinician', 'referral_created', 'screening', 'referred', 'Specialist referral generated to District Ophthalmology Hospital.', '{"referral_id": "ref-1002"}', '2026-11-12T11:00:00Z'),
('evt-1002-3', 'CL-1002', 'usr-clin-1', 'clinician', 'clinician_handoff', 'referred', 'referred', 'Clinician handoff notes sent to Dr. Rajesh Gupta.', '{"receiving_clinician": "usr-clin-2"}', '2026-11-12T11:15:00Z'),
('evt-1004-1', 'CL-1004', 'usr-cw-4', 'care_worker', 'attendance_recorded', 'appointment_scheduled', 'in_care', 'Appointment recorded as no_show: patient unable to travel.', '{"appointment_id": "apt-1004", "status": "no_show"}', '2026-11-10T08:00:00Z'),
('evt-1005-1', 'CL-1005', 'usr-clin-1', 'clinician', 'verified_closure', 'in_care', 'completed', 'Verified closure recorded: Glycemic control stabilized and BP normal.', '{"outcome": "treatment_plan_established"}', '2026-11-13T16:45:00Z'),
('evt-1011-1', 'CL-1011', 'usr-admin-1', 'admin', 'verified_closure', 'in_care', 'completed', 'Verified closure recorded: Completed antihypertensive management cycle.', '{"outcome": "care_completed"}', '2026-11-10T15:10:00Z');

-- Verified Closure Records
INSERT OR IGNORE INTO closure_records (id, case_id, outcome, verification_actor_id, verification_actor_role, evidence_note, verified_at, created_at) VALUES
('cls-1005', 'CL-1005', 'treatment_plan_established', 'usr-clin-1', 'clinician', 'HbA1c reduced to 6.8%. Dietitian consultation completed, repeat fundus examination documented with non-progression.', '2026-11-13T16:45:00Z', '2026-11-13T16:45:00Z'),
('cls-1011', 'CL-1011', 'care_completed', 'usr-admin-1', 'admin', 'Documented two successive normotensive readings (120/78, 118/76). Patient confirmed prescription adherence.', '2026-11-10T15:10:00Z', '2026-11-10T15:10:00Z');
