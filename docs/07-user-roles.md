# 07 — User Roles

Nine roles total; eight active in Phase 1 (Nurse deferred). Role value stored in
`users.role` and mirrored into the Firebase Auth custom claim `role`.

| Role code | Display name | Scope claim(s) | Phase | Summary |
|---|---|---|---|---|
| `super_admin` | Super Admin | none (platform-wide) | 1 (web) | Owns the platform: hospitals, hospital admins, platform analytics. |
| `admin` | Admin | `hospitalId` | 1 (web) | Owns one hospital: staff, departments, settings, hospital-wide reports. |
| `office` | Office | `hospitalId`, `branchId` | 1 (web) | Owns scheduling: slot templates review, appointment approval, queues. |
| `reception` | Reception | `hospitalId`, `branchId` | 1 (web) | Front desk: check-in, tokens, vitals capture, walk-in patient/booking creation. |
| `doctor` | Doctor | `hospitalId`, `branchId` | 1 (web), 2 (mobile) | Clinical: availability, consultation, prescriptions, orders, admissions. |
| `pharmacy` | Pharmacy | `hospitalId`, `branchId` | 1 (web) | Dispensing: prescription fulfillment, inventory. |
| `lab` | Laboratory | `hospitalId`, `branchId` | 1 (web) | Diagnostics: order pipeline, report upload. |
| `patient` | Patient | none (cross-hospital; scoped by ownership, not tenant) | 1 (web portal), 2 (mobile) | Self-service: booking, records, recovery tracking. |
| `nurse` | Nurse | `hospitalId`, `branchId` | Deferred | Reserved role code; no Phase 1 UI/permissions. |

## 7.1 Scope model

- **Platform scope** (`super_admin`): claim carries no `hospitalId` — rules grant
  access based on role alone.
- **Hospital scope** (`admin`): claim carries `hospitalId` — rules grant access to any
  document where `resource.hospitalId == request.auth.token.hospitalId`, regardless
  of branch.
- **Branch scope** (`office`, `reception`, `doctor`, `pharmacy`, `lab`, `nurse`):
  claim carries both `hospitalId` and `branchId` — rules additionally require
  `resource.branchId == request.auth.token.branchId`.
- **Ownership scope** (`patient`): no hospital/branch claim. Rules grant access based
  on the document referencing the patient's own `uid` (e.g.,
  `resource.patientId == request.auth.uid`), regardless of which hospital the record
  belongs to — a patient's data follows the patient, not a tenant boundary. This is
  intentional: a patient may be treated at multiple hospitals on the platform and
  must see their own consolidated history.

## 7.2 Provisioning

- `super_admin`: seeded manually (not via in-app UI) during initial platform setup.
- `admin`: created only by `super_admin`.
- `office` / `reception` / `doctor` / `pharmacy` / `lab`: created only by `admin` (of
  the same hospital).
- `patient`: self-registers via the public signup flow, or is created by `reception`
  on behalf of a walk-in.

## 7.3 Deactivation

Disabling any staff role's `users` document (`status = disabled`) revokes their
custom claims on next token refresh and blocks new logins immediately via a Cloud
Function trigger (`onUserStatusChange`) that force-revokes existing sessions. Patient
accounts are never disabled by hospital staff — only by the patient themselves
(account closure) or Super Admin (platform abuse).
