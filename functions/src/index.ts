import { getApps, initializeApp } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp();
}

export { onUserCreateSetClaims } from "./triggers/onUserCreateSetClaims";
export { onUserStatusChange } from "./triggers/onUserStatusChange";
export { onHospitalStatusChange } from "./triggers/onHospitalStatusChange";

// Module 2 — Hospital & Branch Management (docs/13-cloud-functions.md §13.3).
export { createHospital } from "./callable/createHospital";
export { updateHospital } from "./callable/updateHospital";
export { setHospitalStatus } from "./callable/setHospitalStatus";
export { createBranch } from "./callable/createBranch";
export { updateBranch } from "./callable/updateBranch";
export { setBranchStatus } from "./callable/setBranchStatus";
export { assignHospitalAdmin } from "./callable/assignHospitalAdmin";

// Module 3 — Staff & Department Management (docs/13-cloud-functions.md §13.3).
export { createStaffAccount } from "./callable/createStaffAccount";
export { createDoctorAccount } from "./callable/createDoctorAccount";
export { updateStaffAccount } from "./callable/updateStaffAccount";
export { updateDoctorProfile } from "./callable/updateDoctorProfile";
export { setStaffStatus } from "./callable/setStaffStatus";
export { createDepartment } from "./callable/createDepartment";
export { updateDepartment } from "./callable/updateDepartment";
export { setDepartmentStatus } from "./callable/setDepartmentStatus";

// Module 4 — Hospital Settings & Catalogs (docs/13-cloud-functions.md §13.3).
export { createHoliday } from "./callable/createHoliday";
export { setHolidayStatus } from "./callable/setHolidayStatus";
export { deleteHoliday } from "./callable/deleteHoliday";
export { createWard } from "./callable/createWard";
export { updateWard } from "./callable/updateWard";
export { setWardStatus } from "./callable/setWardStatus";
export { createRoom } from "./callable/createRoom";
export { updateRoom } from "./callable/updateRoom";
export { setRoomStatus } from "./callable/setRoomStatus";
export { createBed } from "./callable/createBed";
export { setBedStatus } from "./callable/setBedStatus";
export { createLabTest } from "./callable/createLabTest";
export { updateLabTest } from "./callable/updateLabTest";
export { setLabTestStatus } from "./callable/setLabTestStatus";
export { createMedicineInventoryItem } from "./callable/createMedicineInventoryItem";
export { updateMedicineInventoryItem } from "./callable/updateMedicineInventoryItem";
export { setMedicineInventoryItemStatus } from "./callable/setMedicineInventoryItemStatus";

// Module 5 — Doctor Availability & Slot Management (docs/13-cloud-functions.md §13.3).
export { createAvailabilityTemplate } from "./callable/createAvailabilityTemplate";
export { setAvailabilityTemplateStatus } from "./callable/setAvailabilityTemplateStatus";
export { setSlotStatus } from "./callable/setSlotStatus";
export { bulkApproveSlots } from "./callable/bulkApproveSlots";
export { createManualSlot } from "./callable/createManualSlot";
export { generateRollingSlots } from "./scheduled/generateRollingSlots";

// Doctor Availability Requests (Doctor Dashboard modules add-on).
export { createAvailabilityRequest } from "./callable/createAvailabilityRequest";
export { respondAvailabilityRequest } from "./callable/respondAvailabilityRequest";

// Module 6 — Patient Registration & Portal (docs/13-cloud-functions.md §13.3).
export { registerPatientProfile } from "./callable/registerPatientProfile";
export { createWalkInPatient } from "./callable/createWalkInPatient";
export { updatePatientProfile } from "./callable/updatePatientProfile";
export { setPatientStatus } from "./callable/setPatientStatus";

// Module 7 — Appointment Booking (docs/13-cloud-functions.md §13.3).
export { bookAppointment } from "./callable/bookAppointment";
export { createEmergencyAppointment } from "./callable/createEmergencyAppointment";
export { setAppointmentStatus } from "./callable/setAppointmentStatus";
export { rescheduleAppointment } from "./callable/rescheduleAppointment";
export { joinWaitingList } from "./callable/joinWaitingList";

// Module 8 — Reception & Vitals (docs/13-cloud-functions.md §13.3).
export { checkInPatient } from "./callable/checkInPatient";
export { recordVitals } from "./callable/recordVitals";

// Module 9 — Consultation Workspace (docs/13-cloud-functions.md §13.3).
export { submitConsultation } from "./callable/submitConsultation";

// Module 10 — Laboratory Workflow (docs/13-cloud-functions.md §13.3).
export { advanceLabOrderStatus } from "./callable/advanceLabOrderStatus";
export { uploadLabReport } from "./callable/uploadLabReport";

// Doctor Labs module (Doctor Dashboard modules add-on) — standalone lab
// order assignment + Office payment gate ahead of the Module 10 pipeline.
export { assignLabOrder } from "./callable/assignLabOrder";
export { markLabOrderPaid } from "./callable/markLabOrderPaid";

// Module 11 — Pharmacy Workflow (docs/13-cloud-functions.md §13.3).
export { dispenseMedicine } from "./callable/dispenseMedicine";
export { dispatchExpiryAlerts } from "./scheduled/dispatchExpiryAlerts";

// Doctor Medicine Orders module (Doctor Dashboard modules add-on).
export { assignMedicineOrder } from "./callable/assignMedicineOrder";

// Module 12 — Admissions & Bed Management (docs/13-cloud-functions.md §13.3).
export { dischargePatient } from "./callable/dischargePatient";
export { assignBedToAdmission } from "./callable/assignBedToAdmission";

// Nurse Ward Care (docs/14-api-design.md §14.2 — Nurse role activation).
export { updateWardCareStatus } from "./callable/updateWardCareStatus";

// Module 14 — Recovery Tracking (docs/13-cloud-functions.md §13.3).
export { submitHealthUpdate } from "./callable/submitHealthUpdate";
export { logMedicineStatus } from "./callable/logMedicineStatus";

// Module 15 — Billing (docs/13-cloud-functions.md §13.3).
export { generateInvoice } from "./callable/generateInvoice";
export { recordPayment } from "./callable/recordPayment";

// Module 16 — Notifications (docs/13-cloud-functions.md §13.3).
export { markNotificationRead } from "./callable/markNotificationRead";
export { dispatchAppointmentReminders } from "./scheduled/dispatchAppointmentReminders";
export { dispatchMedicineReminders } from "./scheduled/dispatchMedicineReminders";
export { dispatchFollowUpReminders } from "./scheduled/dispatchFollowUpReminders";

// Module 17 — Feedback & Complaints (docs/13-cloud-functions.md §13.3).
export { submitFeedback } from "./callable/submitFeedback";
export { resolveFeedback } from "./callable/resolveFeedback";

// Module 18 — Analytics (docs/13-cloud-functions.md §13.2).
export { rollUpDailyStats } from "./scheduled/rollUpDailyStats";
