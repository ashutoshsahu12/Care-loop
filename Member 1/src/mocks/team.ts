export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  specialty: string;
  location: string;
  patients: number;
  status: "Active" | "On leave";
}

export const teamMembers: TeamMember[] = [
  { id: "TW-104", name: "Dr. Maya Chen", initials: "MC", role: "Physician", specialty: "Primary care", location: "Bayview Medical", patients: 42, status: "Active" },
  { id: "TW-103", name: "Jordan Lee", initials: "JL", role: "Care coordinator", specialty: "Patient outreach", location: "Bayview Medical", patients: 36, status: "Active" },
  { id: "TW-102", name: "Dr. Priya Patel", initials: "PP", role: "Physician", specialty: "Women's health", location: "Northside Clinic", patients: 38, status: "Active" },
  { id: "TW-101", name: "Sam Rivera", initials: "SR", role: "Care coordinator", specialty: "Follow-up care", location: "Bayview Medical", patients: 31, status: "Active" },
  { id: "TW-100", name: "Dr. James Wilson", initials: "JW", role: "Physician", specialty: "Gastroenterology", location: "Northside Clinic", patients: 29, status: "On leave" },
  { id: "TW-099", name: "Alex Morgan", initials: "AM", role: "Care coordinator", specialty: "Care navigation", location: "East Bay Center", patients: 33, status: "Active" },
];
