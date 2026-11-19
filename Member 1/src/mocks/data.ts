import type { Appointment, CareNotification, FollowUp, Patient, Screening } from "../types";

export const DEMO_PATIENT_ID = "CL-2048";

export const patients: Patient[] = [
  { id: "CL-2048", caseId: "CASE-2048", name: "Olivia Rhye", initials: "OR", age: 42, gender: "Female", phone: "+1 (415) 555-0182", email: "olivia.rhye@email.com", location: "San Francisco, CA", screening: "Mammogram", result: "BI-RADS 4 · Suspicious finding", status: "Appointment scheduled", priority: "High", priorityReason: "Configured demo rule: an abnormal result needs timely clinical review. This workflow priority is not a diagnosis.", reviewState: "Reviewed by Dr. Maya Chen", screeningDate: "Nov 15, 2026", dueAt: "2026-11-17T13:00:00-08:00", doctor: "Dr. Maya Chen", coordinator: "Jordan Lee", lastActivity: "Today, 9:42 AM", nextAction: "Complete diagnostic ultrasound", appointment: "Today, 2:30 PM" },
  { id: "CL-2047", name: "Ethan Brooks", initials: "EB", age: 56, gender: "Male", phone: "+1 (415) 555-0143", email: "ethan.brooks@email.com", location: "Oakland, CA", screening: "Colorectal FIT", result: "Positive · Follow-up required", status: "Overdue", priority: "High", doctor: "Dr. James Wilson", coordinator: "Sam Rivera", lastActivity: "Yesterday, 4:18 PM", nextAction: "Reach patient · 3rd attempt" },
  { id: "CL-2046", name: "Amara Okafor", initials: "AO", age: 38, gender: "Female", phone: "+1 (415) 555-0137", email: "amara.okafor@email.com", location: "Berkeley, CA", screening: "Cervical screening", result: "HPV positive · Type 16", status: "Referred", priority: "High", doctor: "Dr. Priya Patel", coordinator: "Jordan Lee", lastActivity: "Yesterday, 11:05 AM", nextAction: "Confirm colposcopy appointment" },
  { id: "CL-2045", name: "Noah Williams", initials: "NW", age: 63, gender: "Male", phone: "+1 (415) 555-0119", email: "noah.williams@email.com", location: "San Francisco, CA", screening: "Lung CT", result: "Lung-RADS 3 · Indeterminate", status: "Awaiting patient", priority: "Medium", doctor: "Dr. Maya Chen", coordinator: "Alex Morgan", lastActivity: "Nov 14, 2:31 PM", nextAction: "Patient to confirm appointment" },
  { id: "CL-2044", name: "Sofia Martinez", initials: "SM", age: 51, gender: "Female", phone: "+1 (415) 555-0164", email: "sofia.martinez@email.com", location: "Daly City, CA", screening: "Mammogram", result: "BI-RADS 0 · Additional imaging", status: "In progress", priority: "Medium", doctor: "Dr. Priya Patel", coordinator: "Sam Rivera", lastActivity: "Nov 14, 10:12 AM", nextAction: "Schedule diagnostic imaging" },
  { id: "CL-2043", name: "Liam Chen", initials: "LC", age: 47, gender: "Male", phone: "+1 (415) 555-0191", email: "liam.chen@email.com", location: "Richmond, CA", screening: "Colorectal FIT", result: "Positive · Follow-up required", status: "Resolved", priority: "Routine", doctor: "Dr. James Wilson", coordinator: "Alex Morgan", lastActivity: "Nov 13, 3:46 PM", nextAction: "Document closure confirmation" },
  { id: "CL-2042", name: "Grace Kim", initials: "GK", age: 34, gender: "Female", phone: "+1 (415) 555-0125", email: "grace.kim@email.com", location: "San Francisco, CA", screening: "Cervical screening", result: "High-grade lesion · HSIL", status: "Closed", priority: "Routine", doctor: "Dr. Maya Chen", coordinator: "Jordan Lee", lastActivity: "Nov 12, 1:20 PM", nextAction: "Case closed · care documented" },
];

patients[0].clinicalNotes = [
  { id: "CN-2048", author: "Dr. Maya Chen", createdAt: "Nov 15 · 9:46 AM", text: "Reviewed imaging report. Recommend diagnostic ultrasound within 7 days. Patient reached by phone and understands the next steps." },
];
patients[0].communicationLog = [
  { id: "CM-2048", createdAt: "Nov 15 · 10:03 AM", channel: "Phone call", outcome: "Reached patient; next steps explained." },
];

export const appointments: Appointment[] = [
  { id: "AP-9301", patient: "Olivia Rhye", patientId: "CL-2048", initials: "OR", type: "Diagnostic ultrasound", date: "Nov 17, 2026", time: "2:30 PM", clinician: "Dr. Maya Chen", status: "Confirmed" },
  { id: "AP-9302", patient: "Amara Okafor", initials: "AO", type: "Colposcopy consultation", date: "Tomorrow, Nov 18", time: "10:00 AM", clinician: "Dr. Priya Patel", status: "Needs confirmation" },
  { id: "AP-9303", patient: "Sofia Martinez", initials: "SM", type: "Diagnostic mammogram", date: "Wed, Nov 19", time: "11:15 AM", clinician: "Dr. Priya Patel", status: "Confirmed" },
  { id: "AP-9304", patient: "Noah Williams", initials: "NW", type: "Pulmonology consultation", date: "Fri, Nov 21", time: "9:00 AM", clinician: "Dr. Maya Chen", status: "Confirmed" },
];

export const followUps: FollowUp[] = [
  { id: "FU-1182", patient: "Ethan Brooks", initials: "EB", reason: "Positive FIT · patient outreach", due: "2 days overdue", owner: "Sam Rivera", status: "Overdue" },
  { id: "FU-1181", patient: "Olivia Rhye", patientId: "CL-2048", initials: "OR", reason: "Confirm diagnostic imaging", due: "Today, 1:00 PM", owner: "Jordan Lee", status: "Due today" },
  { id: "FU-1179", patient: "Amara Okafor", initials: "AO", reason: "Colposcopy appointment check-in", due: "Tomorrow, 10:00 AM", owner: "Jordan Lee", status: "Upcoming" },
  { id: "FU-1177", patient: "Noah Williams", initials: "NW", reason: "Appointment confirmation", due: "Nov 19, 9:00 AM", owner: "Alex Morgan", status: "Upcoming" },
];

export const screenings: Screening[] = [
  { id: "SR-5812", patient: "Olivia Rhye", patientId: "CL-2048", initials: "OR", type: "Mammogram", date: "Nov 15, 2026", recordedAt: "2026-11-15T09:12:00-08:00", result: "BI-RADS 4 · Suspicious finding", status: "Abnormal", clinician: "Dr. Maya Chen", priority: "High", priorityReason: "Configured demo rule: an abnormal result needs timely clinical review. This workflow priority is not a diagnosis.", reviewState: "Reviewed by Dr. Maya Chen" },
  { id: "SR-5811", patient: "Ethan Brooks", initials: "EB", type: "Colorectal FIT", date: "Nov 14, 2026", result: "Positive · Follow-up required", status: "Abnormal", clinician: "Dr. James Wilson" },
  { id: "SR-5810", patient: "Amara Okafor", initials: "AO", type: "Cervical screening", date: "Nov 13, 2026", result: "HPV positive · Type 16", status: "Abnormal", clinician: "Dr. Priya Patel" },
  { id: "SR-5809", patient: "Noah Williams", initials: "NW", type: "Lung CT", date: "Nov 12, 2026", result: "Lung-RADS 3 · Indeterminate", status: "Pending review", clinician: "Dr. Maya Chen" },
  { id: "SR-5808", patient: "Sofia Martinez", initials: "SM", type: "Mammogram", date: "Nov 11, 2026", result: "BI-RADS 0 · Additional imaging", status: "Abnormal", clinician: "Dr. Priya Patel" },
  { id: "SR-5807", patient: "Liam Chen", initials: "LC", type: "Colorectal FIT", date: "Nov 10, 2026", result: "Positive · Follow-up required", status: "Abnormal", clinician: "Dr. James Wilson" },
  { id: "SR-5806", patient: "Grace Kim", initials: "GK", type: "Cervical screening", date: "Nov 9, 2026", result: "Normal · Routine interval", status: "Normal", clinician: "Dr. Maya Chen" },
];

export const chartData = [
  { month: "Jun", screened: 236, closed: 182 },
  { month: "Jul", screened: 278, closed: 219 },
  { month: "Aug", screened: 254, closed: 208 },
  { month: "Sep", screened: 312, closed: 251 },
  { month: "Oct", screened: 294, closed: 244 },
  { month: "Nov", screened: 342, closed: 291 },
];

export const distributionData = [
  { name: "Mammography", value: 38, color: "#2c7be5" },
  { name: "Colorectal", value: 27, color: "#25a99a" },
  { name: "Cervical", value: 21, color: "#8b7ee8" },
  { name: "Lung", value: 14, color: "#f1b85b" },
];

export const notifications: CareNotification[] = [
  { id: 1, title: "High-priority case needs attention", description: "Ethan Brooks · Positive FIT result is 2 days overdue.", time: "12 min ago", unread: true, tone: "rose" },
  { id: 2, title: "Appointment confirmed", description: "Olivia Rhye confirmed diagnostic ultrasound for today at 2:30 PM.", time: "1 hour ago", unread: true, tone: "teal" },
  { id: 3, title: "New screening result received", description: "Liam Chen · Colorectal FIT result is ready for review.", time: "3 hours ago", unread: false, tone: "blue" },
  { id: 4, title: "Follow-up completed", description: "Grace Kim's post-treatment check-in was documented by Jordan Lee.", time: "Yesterday", unread: false, tone: "green" },
  { id: "NT-2048", patientId: "CL-2048", caseId: "CASE-2048", title: "A care team update is ready", description: "Your care team shared an update about your screening case. Review your case page for the current next step.", time: "Nov 15, 2026 · 10:03 AM", createdAt: "2026-11-15T10:03:00-08:00", unread: true, tone: "blue", acknowledgedAt: null },
];
