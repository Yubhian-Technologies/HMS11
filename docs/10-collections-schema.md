# 10 — Collection Schema

Field-level schema for every Firestore collection, expressed as TypeScript
interfaces. These are the literal shapes that will live in
`packages/shared/src/types/*.ts`, re-exported for use by `apps/web` and `functions`.
Common fields (§9.2 of [09-firestore-design.md](./09-firestore-design.md)) are shown
once via `BaseDoc` and inherited — not repeated per interface below.

```ts
interface BaseDoc {
  hospitalId: string;
  branchId: string | null;
  createdBy: string;      // uid
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: string;          // collection-specific enum, see 09-firestore-design.md §9.4
}
```

## Tenancy

```ts
// hospitals/{hospitalId}
interface Hospital extends BaseDoc {
  name: string;
  registrationNumber?: string;
  contactEmail: string;
  contactPhone: string;
  address: Address;
  adminUserId: string | null;      // uid of assigned Admin
  status: "active" | "disabled";
}

// hospitals/{hospitalId}/branches/{branchId}
interface Branch extends BaseDoc {
  name: string;                    // "Main Branch" auto-created with the hospital
  address: Address;
  contactPhone: string;
  timings: { day: Weekday; open: string; close: string }[];
  status: "active" | "disabled";
}

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
```

## Identity

```ts
// users/{uid}  — covers every role including patient
interface User extends BaseDoc {
  role: "super_admin" | "admin" | "office" | "reception" | "doctor" | "pharmacy" | "lab" | "patient" | "nurse";
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  fcmTokens: string[];
  status: "active" | "disabled";
  // hospitalId/branchId are null for super_admin and patient (see 07-user-roles.md §7.1)
}

// patients/{uid}  — extends the base user profile with clinical intake data; 1:1 with users/{uid} when self-registered, or a standalone doc (own generated id) for reception-created walk-ins not yet linked to an auth account
interface PatientProfile extends BaseDoc {
  userId: string | null;           // null until the walk-in patient claims/links an account
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  dob: string;                     // ISO date
  phone: string;
  email?: string;
  address: Address;
  bloodGroup: string;
  emergencyContact: { name: string; relation: string; phone: string };
  medicalHistory: string;
  currentMedications: string;
  allergies: string;
  insurance?: { provider: string; policyNumber: string; documentUrl?: string };
  status: "active" | "disabled";
}

// doctorProfiles/{uid}
interface DoctorProfile extends BaseDoc {
  departmentId: string;
  specialization: string;
  qualifications: string[];
  consultationFee: number;
  status: "active" | "disabled";
}
```

## Hospital configuration

```ts
// departments/{id}
interface Department extends BaseDoc {
  name: string;
  status: "active" | "disabled";
}

// labTestMaster/{id}
interface LabTestMasterItem extends BaseDoc {
  name: string;
  category: string;
  price: number;
  sampleType: string;
  status: "active" | "disabled";
}

// medicineInventory/{id}
interface MedicineInventoryItem extends BaseDoc {
  name: string;
  batchNumber: string;
  expiryDate: string;              // ISO date
  quantityInStock: number;
  reorderLevel: number;
  unitPrice: number;
  status: "active" | "disabled";
}

// holidays/{id}
interface Holiday extends BaseDoc {
  date: string;                    // ISO date
  reason: string;
}

// wards/{id}
interface Ward extends BaseDoc {
  building: string;
  floor: string;
  name: string;
  status: "active" | "disabled";
}

// rooms/{id}
interface Room extends BaseDoc {
  wardId: string;
  roomNumber: string;
  status: "active" | "disabled";
}

// beds/{id}
interface Bed extends BaseDoc {
  roomId: string;
  wardId: string;                  // denormalized for direct bed-availability queries
  bedNumber: string;
  status: "available" | "occupied" | "reserved" | "cleaning" | "maintenance";
}
```

## Scheduling

A doctor's availability is a count per session (morning/afternoon), not a
picked clock-time range — a consultation's real duration can't be predicted,
so nothing pretends to. Booking draws from a session's pool as an atomic
counter increment; there is no per-patient time.

```ts
// doctorAvailabilityTemplates/{id}
interface DoctorAvailabilityTemplate extends BaseDoc {
  doctorId: string;
  weekday: Weekday;
  morningSlots: number;
  afternoonSlots: number;
  morningWalkInReserved: number;    // subset of morningSlots held back for Reception's walk-in booking (0 = off)
  afternoonWalkInReserved: number;
  status: "active" | "disabled";
}

// doctorSlots/{doctorId}_{date}_{session} — one pool per doctor/date/session,
// not one doc per bookable unit.
interface DoctorSlot extends BaseDoc {
  doctorId: string;
  date: string;                     // ISO date
  session: "morning" | "afternoon";
  totalCount: number;
  walkInReserved: number;
  onlineBookedCount: number;
  walkInBookedCount: number;
  status: "pendingApproval" | "approved" | "rejected" | "blocked";
  generatedByTemplateId: string | null;   // null if Office manually added it
}
```

## Visit lifecycle

```ts
// appointments/{id}
interface Appointment extends BaseDoc {
  patientId: string;
  patientName: string;              // denormalized for list views
  doctorId: string;
  departmentId: string;
  type: "normal" | "emergency";
  priority: number;                 // emergency queue ordering; 0 for normal
  date: string;
  session: "morning" | "afternoon" | null;  // null for emergency / not-yet-promoted waiting-list entries
  bookedVia: "online" | "walkin" | null;    // which doctorSlots counter bucket this booking drew from
  startTime: string | null;         // no per-slot clock time exists; only ever set for emergency (the actual check-in time)
  token: string | null;             // assigned at check-in
  status: "pending" | "approved" | "rejected" | "rescheduled" | "checkedIn" | "completed" | "cancelled";
  waitingListPosition: number | null;
}

// vitals/{id}
interface Vitals extends BaseDoc {
  appointmentId: string;
  patientId: string;
  weightKg: number;
  heightCm: number;
  bmi: number;                      // computed at write time
  bloodPressure: string;            // "120/80"
  pulse: number;
  sugarMgDl: number;
  temperatureC: number;
  spo2: number;
  chiefComplaint: string;
  notes: string;
}

// consultations/{id}
interface Consultation extends BaseDoc {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  clinicalNotes: string;
  supersedesConsultationId: string | null;   // append-only correction chain, see 09 §9.5
}

// prescriptions/{id}
interface Prescription extends BaseDoc {
  consultationId: string;
  patientId: string;
  doctorId: string;
  items: PrescriptionItem[];
}

interface PrescriptionItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}
```

## Laboratory

```ts
// labOrders/{id}
interface LabOrder extends BaseDoc {
  consultationId: string;
  patientId: string;
  doctorId: string;
  testId: string;                   // ref labTestMaster
  testName: string;                 // denormalized
  status: "pending" | "sampleCollected" | "processing" | "completed" | "verified" | "reportUploaded";
}

// labReports/{id}
interface LabReport extends BaseDoc {
  labOrderId: string;
  patientId: string;
  fileUrl: string;                  // Storage path
  verifiedBy: string;                // uid of lab staff
  summaryNotes?: string;
}
```

## Pharmacy

```ts
// medicineDispenses/{id}
interface MedicineDispense extends BaseDoc {
  prescriptionId: string;
  prescriptionItemIndex: number;
  patientId: string;
  dispensedBy: string;               // uid
  quantityDispensed: number;
}

// medicineLogs/{id}
interface MedicineLog extends BaseDoc {
  patientId: string;
  prescriptionId: string;
  prescriptionItemIndex: number;
  scheduledAt: Timestamp;
  patientStatus: "pending" | "taken" | "missed" | "skipped";
}
```

## Admission

```ts
// admissions/{id}
interface Admission extends BaseDoc {
  consultationId: string;
  patientId: string;
  doctorId: string;
  bedId: string;
  admittedAt: Timestamp;
  dischargedAt: Timestamp | null;
  dischargeSummary: DischargeSummary | null;
  status: "admitted" | "discharged";
}

interface DischargeSummary {
  diagnosis: string;
  treatmentGiven: string;
  conditionAtDischarge: string;
  followUpInstructions: string;
  authoredBy: string;                // doctor uid
  authoredAt: Timestamp;
}
```

## Follow-up & documents

```ts
// followUps/{id}
interface FollowUp extends BaseDoc {
  patientId: string;
  doctorId: string;
  sourceConsultationId: string;
  scheduledDate: string;
  resultingAppointmentId: string | null;
}

// medicalCertificates/{id}
interface MedicalCertificate extends BaseDoc {
  patientId: string;
  doctorId: string;
  consultationId: string;
  reason: string;
  restFromDate: string;
  restToDate: string;
  fileUrl: string;                   // generated PDF, Storage path
}

// referrals/{id}
interface Referral extends BaseDoc {
  patientId: string;
  fromDoctorId: string;
  toDepartmentId: string;
  toDoctorId: string | null;
  reason: string;
}
```

## Billing, feedback, notifications, audit

```ts
// invoices/{id}
interface Invoice extends BaseDoc {
  appointmentId: string;
  admissionId: string | null;
  patientId: string;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
  paidAmount: number;
  paymentMethod: "cash" | "card" | "upi" | null;
  status: "unpaid" | "partial" | "paid";
}

interface InvoiceLineItem {
  type: "consultation" | "lab" | "pharmacy" | "room";
  description: string;
  amount: number;
}

// feedback/{id}
interface Feedback extends BaseDoc {
  appointmentId: string;
  patientId: string;
  rating: number;                    // 1-5
  comment: string;
  isComplaint: boolean;
  status: "open" | "acknowledged" | "resolved";
}

// notifications/{id}
interface Notification extends BaseDoc {
  userId: string;                    // recipient
  type: "appointmentConfirmation" | "appointmentReminder" | "medicineReminder"
      | "labReportReady" | "prescriptionReady" | "followUpReminder" | "emergencyUpdate";
  title: string;
  body: string;
  read: boolean;
  relatedEntityId: string | null;
}

// healthUpdates/{id}
interface HealthUpdate extends BaseDoc {
  patientId: string;
  condition: "better" | "same" | "worse";
  painLevel: number;                 // 0-10
  sugarMgDl?: number;
  bloodPressure?: string;
  temperatureC?: number;
  weightKg?: number;
}

// auditLogs/{id}  — no BaseDoc inheritance; append-only, distinct shape
interface AuditLog {
  hospitalId: string;                // "platform" for super_admin-scoped actions
  actorId: string;                   // uid
  actorRole: string;
  action: "create" | "update" | "statusChange";
  entityType: string;                // e.g. "appointments"
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  createdAt: Timestamp;
}
```
